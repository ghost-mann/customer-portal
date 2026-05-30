"""Customer-portal backend.

Every method scopes data to the Customer linked to the current Frappe user.
A user is considered a "customer contact" when a Contact record with the
user's email has a Dynamic Link → Customer entry. If no such link exists,
all methods raise PermissionError.

System Manager and Sales Manager are treated as the linked customer for
demo / support purposes — they may pass an explicit `customer` argument
on read endpoints to impersonate.
"""

import json

import frappe
from frappe import _

# ── Permission helpers ───────────────────────────────────────────────────────

STAFF_ROLES = {"System Manager", "Sales Manager", "Sales User", "CRM Manager", "CRM User"}

def _is_staff() -> bool:
	return bool(set(frappe.get_roles(frappe.session.user)) & STAFF_ROLES)


@frappe.whitelist()
def get_csrf_token() -> dict:
	"""Return a fresh CSRF token for the current session. GET-safe.
	Called by the React app to recover from stale tokens after the page
	has been open long enough that the boot-injected token has rotated."""
	return {"csrf_token": frappe.sessions.get_csrf_token()}


@frappe.whitelist()
def list_customers(search: str = "", limit: int = 30) -> list:
	"""Return a list of customers for the staff impersonation picker.
	Only callable by staff — customer-contacts get an empty list."""
	if not _is_staff():
		return []
	filters = {"disabled": 0}
	or_filters = None
	if search:
		s = f"%{search}%"
		or_filters = [
			["name", "like", s],
			["customer_name", "like", s],
		]
	return frappe.get_all(
		"Customer",
		filters=filters,
		or_filters=or_filters,
		fields=["name", "customer_name", "customer_group", "territory", "customer_type"],
		order_by="customer_name asc",
		limit_page_length=int(limit),
	) or []


def _resolve_customer(impersonate: str | None = None, allow_staff_unset: bool = False) -> str | None:
	"""Return the Customer name linked to the current user. Staff may impersonate
	by passing a customer name. Raises PermissionError if a real customer-contact
	has no link. For staff with no impersonate set, returns None when
	allow_staff_unset=True so the caller can render a picker."""
	user = frappe.session.user
	if user == "Guest":
		frappe.throw(_("Please sign in to access the customer portal."), frappe.PermissionError)

	if impersonate and _is_staff():
		if not frappe.db.exists("Customer", impersonate):
			frappe.throw(_("Customer {0} not found.").format(impersonate))
		return impersonate

	# Find Contact for this user, then its first Customer dynamic link
	contact = frappe.db.get_value("Contact", {"user": user}, "name")
	if contact:
		row = frappe.db.get_value(
			"Dynamic Link",
			{"parenttype": "Contact", "parent": contact, "link_doctype": "Customer"},
			"link_name",
		)
		if row:
			return row

	# Staff: explicit "needs to pick one" state — callers handle it.
	if _is_staff():
		if allow_staff_unset:
			return None
		frappe.throw(
			_("Pick a customer from the impersonation menu in the top-right to view the portal."),
			frappe.PermissionError,
		)

	frappe.throw(
		_("Your user account is not linked to a customer record. Contact your account manager."),
		frappe.PermissionError,
	)


# ── Context ──────────────────────────────────────────────────────────────────

@frappe.whitelist()
def get_my_context(customer: str | None = None) -> dict:
	"""Identity + company + manager + currency. Called once on app boot.
	For staff with no customer selected, returns a stub asking them to pick one."""
	user = frappe.session.user
	cust = _resolve_customer(customer, allow_staff_unset=True)

	if cust is None:
		# Staff has not picked a customer to impersonate yet
		return {
			"user": user,
			"full_name": frappe.db.get_value("User", user, "full_name") or user,
			"is_staff": True,
			"needs_impersonation": True,
			"customer": None,
		}

	c = frappe.get_doc("Customer", cust)

	# Account manager — Customer has an `account_manager` link field (User)
	manager = None
	mgr_user = getattr(c, "account_manager", None)
	if mgr_user:
		manager = {
			"user": mgr_user,
			"name": frappe.db.get_value("User", mgr_user, "full_name") or mgr_user,
			"email": mgr_user,
		}

	# Currency from default Price List or company default. Field names vary
	# between sites — use getattr defaults to stay robust.
	cust_currency  = getattr(c, "default_currency", None)
	cust_company   = getattr(c, "default_company", None)
	company_currency = (
		frappe.db.get_value("Company", cust_company, "default_currency") if cust_company else None
	)
	default_currency = (
		cust_currency or company_currency
		or frappe.db.get_default("currency") or "USD"
	)

	# Payment terms
	pt = getattr(c, "payment_terms", None) or None

	return {
		"user": user,
		"full_name": frappe.db.get_value("User", user, "full_name") or user,
		"customer": cust,
		"customer_name": c.customer_name,
		"customer_type": c.customer_type,
		"customer_group": c.customer_group,
		"territory": c.territory,
		"company": c.customer_name,
		"is_company": c.customer_type == "Company",
		"manager": manager,
		"currency": default_currency,
		"payment_terms": pt,
		"is_staff": _is_staff(),
	}


# ── Overview ─────────────────────────────────────────────────────────────────

@frappe.whitelist()
def get_overview(customer: str | None = None) -> dict:
	"""KPIs + at-a-glance lists for the overview page."""
	cust = _resolve_customer(customer)

	def count(dt: str, filters: dict) -> int:
		return frappe.db.count(dt, filters) or 0

	# Open orders = Sales Orders not completed
	open_orders = count("Sales Order", {
		"customer": cust,
		"docstatus": 1,
		"status": ["not in", ["Closed", "Completed", "Cancelled"]],
	})

	# In-flight shipments = submitted Delivery Notes not yet received
	in_flight = count("Delivery Note", {
		"customer": cust,
		"docstatus": 1,
		"status": ["not in", ["Completed", "Closed", "Cancelled", "Return Issued"]],
	})

	# Outstanding invoices
	overdue = count("Sales Invoice", {
		"customer": cust,
		"docstatus": 1,
		"status": ["in", ["Overdue", "Unpaid"]],
	})

	# Open claims
	open_claims = 0
	if frappe.db.exists("DocType", "Customer Feedback"):
		try:
			open_claims = count("Customer Feedback", {
				"customer_company": cust,
				"status": ["not in", ["Resolved", "Closed", "Rejected"]],
			})
		except Exception:
			# Field may be customer_name instead of customer_company on some sites
			try:
				open_claims = count("Customer Feedback", {
					"customer_name": cust,
					"status": ["not in", ["Resolved", "Closed", "Rejected"]],
				})
			except Exception:
				open_claims = 0

	# Recent orders (last 5)
	recent_orders = frappe.get_all(
		"Sales Order",
		filters={"customer": cust, "docstatus": ["!=", 2]},
		fields=["name", "transaction_date", "status", "grand_total", "currency", "delivery_date"],
		order_by="transaction_date desc, creation desc",
		limit=5,
	)

	# Recent shipments (last 5)
	recent_shipments = frappe.get_all(
		"Delivery Note",
		filters={"customer": cust, "docstatus": ["!=", 2]},
		fields=["name", "posting_date", "status", "lr_no", "vehicle_no"],
		order_by="posting_date desc, creation desc",
		limit=5,
	)

	return {
		"kpis": {
			"open_orders": open_orders,
			"in_flight":   in_flight,
			"overdue":     overdue,
			"open_claims": open_claims,
		},
		"recent_orders":    recent_orders,
		"recent_shipments": recent_shipments,
	}


# ── List endpoints ───────────────────────────────────────────────────────────

@frappe.whitelist()
def list_orders(customer: str | None = None, limit: int = 100) -> list:
	cust = _resolve_customer(customer)
	return frappe.get_all(
		"Sales Order",
		filters={"customer": cust, "docstatus": ["!=", 2]},
		fields=[
			"name", "transaction_date", "delivery_date",
			"status", "grand_total", "currency",
			"per_delivered", "per_billed",
			"customer_name", "po_no",
		],
		order_by="transaction_date desc, creation desc",
		limit_page_length=int(limit),
	) or []


@frappe.whitelist()
def list_shipments(customer: str | None = None, limit: int = 100) -> list:
	cust = _resolve_customer(customer)
	return frappe.get_all(
		"Delivery Note",
		filters={"customer": cust, "docstatus": ["!=", 2]},
		fields=[
			"name", "posting_date", "status",
			"lr_no", "lr_date", "vehicle_no",
			"transporter_name", "grand_total", "currency",
			"customer_name", "po_no",
		],
		order_by="posting_date desc, creation desc",
		limit_page_length=int(limit),
	) or []


@frappe.whitelist()
def list_invoices(customer: str | None = None, limit: int = 100) -> list:
	cust = _resolve_customer(customer)
	return frappe.get_all(
		"Sales Invoice",
		filters={"customer": cust, "docstatus": ["!=", 2]},
		fields=[
			"name", "posting_date", "due_date", "status",
			"grand_total", "outstanding_amount", "currency",
			"po_no",
		],
		order_by="posting_date desc, creation desc",
		limit_page_length=int(limit),
	) or []


@frappe.whitelist()
def list_claims(customer: str | None = None, limit: int = 100) -> list:
	cust = _resolve_customer(customer)
	if not frappe.db.exists("DocType", "Customer Feedback"):
		return []

	# Try both possible link field names — Customer Feedback may use either.
	rows = []
	for fld in ("customer_company", "customer_name", "customer"):
		try:
			rows = frappe.get_all(
				"Customer Feedback",
				filters={fld: cust},
				fields=[
					"name", "feedback_date", "feedback_type", "status",
					"invoice_number", "consignment_number",
					"claim_type", "total_stems_claimed", "total_claim_cost",
				],
				order_by="feedback_date desc, creation desc",
				limit_page_length=int(limit),
			) or []
			break
		except Exception:
			continue
	return rows


@frappe.whitelist()
def list_messages(customer: str | None = None, limit: int = 100) -> list:
	"""Communications linked to this customer (CRM emails)."""
	cust = _resolve_customer(customer)
	return frappe.get_all(
		"Communication",
		filters={
			"reference_doctype": "Customer",
			"reference_name": cust,
			"communication_medium": "Email",
		},
		fields=[
			"name", "subject", "sender", "recipients",
			"sent_or_received", "communication_date", "seen", "status",
		],
		order_by="communication_date desc",
		limit_page_length=int(limit),
	) or []


# ── Detail endpoint ──────────────────────────────────────────────────────────

KIND_TO_DOCTYPE = {
	"orders":    "Sales Order",
	"shipments": "Delivery Note",
	"invoices":  "Sales Invoice",
	"claims":    "Customer Feedback",
	"messages":  "Communication",
}


@frappe.whitelist()
def get_doc(doctype_kind: str, name: str) -> dict:
	"""Return the full doc + its child tables, scoped to current customer."""
	cust = _resolve_customer()
	dt = KIND_TO_DOCTYPE.get(doctype_kind)
	if not dt:
		frappe.throw(_("Unknown kind: {0}").format(doctype_kind))

	doc = frappe.get_doc(dt, name)
	# Defense in depth: only return docs that belong to the current customer
	if dt in ("Sales Order", "Delivery Note", "Sales Invoice") and doc.customer != cust:
		frappe.throw(_("Not your document."), frappe.PermissionError)
	if dt == "Customer Feedback":
		owner = (
			getattr(doc, "customer_company", None)
			or getattr(doc, "customer_name", None)
			or getattr(doc, "customer", None)
		)
		if owner and owner != cust and not _is_staff():
			frappe.throw(_("Not your document."), frappe.PermissionError)
	if dt == "Communication":
		if doc.reference_doctype != "Customer" or doc.reference_name != cust:
			if not _is_staff():
				frappe.throw(_("Not your document."), frappe.PermissionError)

	return doc.as_dict()


# ── Message reply ──────────────────────────────────────────────────────────────

@frappe.whitelist()
def reply_to_message(name: str, content: str = "", customer: str | None = None) -> dict:
	"""Reply to a Communication as the current customer.

	Records the reply as a new Communication linked to the same Customer (so it
	shows up in the customer's message thread) and emails it to the other party
	— the sender of the original message, or, if the customer was the original
	sender, the original recipients."""
	cust = _resolve_customer(customer)
	if not (content or "").strip():
		frappe.throw(_("Your reply is empty."))

	orig = frappe.get_doc("Communication", name)
	# Defense in depth: the original must belong to this customer
	if orig.reference_doctype != "Customer" or orig.reference_name != cust:
		if not _is_staff():
			frappe.throw(_("Not your message."), frappe.PermissionError)

	# Reply to the other party. A "Sent" message was sent to the customer, so
	# its sender is the counterparty; a "Received" message came from the
	# customer, so its recipients are the counterparty.
	reply_to = orig.sender if orig.sent_or_received == "Sent" else orig.recipients
	if not reply_to:
		frappe.throw(_("Couldn't work out who to reply to on this message."))

	subject = (orig.subject or "(no subject)").strip()
	if not subject.lower().startswith("re:"):
		subject = f"Re: {subject}"

	sender = frappe.session.user
	sender_name = frappe.db.get_value("User", sender, "full_name") or sender

	comm = frappe.get_doc({
		"doctype": "Communication",
		"communication_type": "Communication",
		"communication_medium": "Email",
		"sent_or_received": "Sent",
		"subject": subject,
		"content": content,
		"sender": sender,
		"sender_full_name": sender_name,
		"recipients": reply_to,
		"reference_doctype": "Customer",
		"reference_name": cust,
		"in_reply_to": orig.name,
	})
	comm.insert(ignore_permissions=True)

	try:
		frappe.sendmail(
			recipients=[r.strip() for r in reply_to.split(",") if r.strip()],
			sender=sender,
			subject=subject,
			message=content,
			communication=comm.name,
		)
		status = "sent"
	except Exception as e:
		status = f"queued (mail not configured: {e})"

	# Mark the original as replied if it was an open inbound message
	try:
		if orig.sent_or_received == "Received" and orig.status == "Open":
			orig.db_set("status", "Replied")
	except Exception:
		pass

	frappe.db.commit()
	return {"name": comm.name, "status": status, "recipients": reply_to, "subject": subject}


# ── Submissions ──────────────────────────────────────────────────────────────

def _read_payload(payload) -> dict:
	if isinstance(payload, str):
		try:
			return json.loads(payload)
		except Exception:
			return {}
	return payload or {}


@frappe.whitelist()
def submit_claim(payload=None, **kwargs) -> dict:
	"""Create a Customer Feedback record of type Quality Claim."""
	cust = _resolve_customer()
	data = _read_payload(payload) or kwargs or {}

	if not frappe.db.exists("DocType", "Customer Feedback"):
		frappe.throw(_("Customer Feedback doctype is not installed on this site."))

	c = frappe.get_doc("Customer", cust)

	doc = frappe.new_doc("Customer Feedback")
	# Try common naming series; if it fails the doctype will fall back to autoname
	try:
		doc.naming_series = "CF-.YYYY.-.####"
	except Exception:
		pass

	doc.feedback_date  = frappe.utils.nowdate()
	doc.feedback_type  = "Quality Claim"
	doc.status         = "Submitted"

	# Set whichever field name the doctype actually has
	for fld in ("customer_company", "customer_name", "customer"):
		if hasattr(doc, fld):
			setattr(doc, fld, c.customer_name)
			break
	# Also store the Customer link if available
	for fld in ("customer",):
		if hasattr(doc, fld):
			try: setattr(doc, fld, cust)
			except Exception: pass

	if hasattr(doc, "contact_name"):  doc.contact_name  = data.get("contact_name") or frappe.session.user
	if hasattr(doc, "contact_email"): doc.contact_email = data.get("contact_email") or frappe.session.user
	if hasattr(doc, "contact_phone"): doc.contact_phone = data.get("contact_phone") or ""

	for fld in ("invoice_number", "consignment_number", "po_number", "shipment_date",
	            "control_point", "claim_type", "currency",
	            "total_stems_claimed", "total_claim_cost", "additional_description"):
		if hasattr(doc, fld) and fld in data:
			setattr(doc, fld, data[fld])

	# Child rows
	items = data.get("claim_items") or []
	if items and hasattr(doc, "append"):
		for it in items:
			try:
				doc.append("claim_items", {
					"variety": it.get("variety"),
					"stem_length": it.get("stem_length"),
					"stems_received": it.get("stems_received") or 0,
					"stems_claimed": it.get("stems_claimed") or 0,
					"price_per_stem": it.get("price_per_stem") or 0,
					"claim_cost": it.get("claim_cost") or 0,
					"reason_category": it.get("reason_category"),
					"reason": it.get("reason"),
					"description": it.get("description") or "",
				})
			except Exception:
				# Child table may have a different name on some sites
				break

	doc.insert(ignore_permissions=True)
	frappe.db.commit()
	return {"name": doc.name, "status": doc.status}


@frappe.whitelist()
def submit_suggestion(payload=None, **kwargs) -> dict:
	"""Quick suggestion / compliment / general feedback — single text body."""
	cust = _resolve_customer()
	data = _read_payload(payload) or kwargs or {}

	c = frappe.get_doc("Customer", cust)
	kind = data.get("feedback_type") or "Suggestion"  # Suggestion | Compliment | General Feedback

	if not frappe.db.exists("DocType", "Customer Feedback"):
		# Fall back to a ToDo so at least *something* is recorded
		td = frappe.new_doc("ToDo")
		td.description = f"[{kind}] {data.get('subject') or ''}\n\n{data.get('body') or ''}"
		td.reference_type = "Customer"
		td.reference_name = cust
		td.insert(ignore_permissions=True)
		frappe.db.commit()
		return {"name": td.name, "status": "Open", "fallback": True}

	doc = frappe.new_doc("Customer Feedback")
	try:
		doc.naming_series = "CF-.YYYY.-.####"
	except Exception:
		pass
	doc.feedback_date = frappe.utils.nowdate()
	doc.feedback_type = kind
	doc.status        = "Submitted"

	for fld in ("customer_company", "customer_name", "customer"):
		if hasattr(doc, fld):
			setattr(doc, fld, c.customer_name)
			break

	if hasattr(doc, "contact_name"):  doc.contact_name  = data.get("contact_name") or frappe.session.user
	if hasattr(doc, "contact_email"): doc.contact_email = data.get("contact_email") or frappe.session.user
	if hasattr(doc, "rating") and data.get("rating"): doc.rating = int(data["rating"])
	if hasattr(doc, "feedback_text"): doc.feedback_text = data.get("body") or ""
	if hasattr(doc, "additional_description"):
		doc.additional_description = f"Subject: {data.get('subject') or '—'}\n\n{data.get('body') or ''}"

	doc.insert(ignore_permissions=True)
	frappe.db.commit()
	return {"name": doc.name, "status": doc.status}
