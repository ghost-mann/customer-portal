"""Webshop backend for the customer_portal customer-facing /website-shop SPA.

Backed by ERPNext's Website Item + Item Price + Quotation. One open draft
Quotation per customer acts as their persistent cart. Tags on Website Item
provide the farm (tag prefix "farm:") and "in-season" filters.

Auth model: identical to customer_portal.api.customer — every method scopes to the
Customer linked to the current user. Staff users may impersonate.
"""

import time

import frappe
from frappe import _

from customer_portal.api.customer import _resolve_customer, _is_staff


# Karen Roses is a flower farm — the shop only lists floral item groups (rose
# grades + variety/filler/foliage), filtering out operational groups like
# hardware, dairy, motor parts, chemicals, etc. Curated from the live Item Group
# list. Groups with no sellable items simply won't appear as categories.
FLOWER_ITEM_GROUPS = (
	"Roses", "Spray Roses", "Standard Roses", "Spray", "Intermediate", "Premium", "Regular",
	"Chrysanthemums", "Summer Flowers", "Flowers Purchased (Sprays & Carnations)",
	"Gypsophilla", "Limonium", "Lepidium", "Solidago", "Eryngium", "Caryopteris",
	"Papyrus", "Photinia", "Hard Ruscus", "Agapanthus",
)


def _mutate_quotation(qname: str, mutate, max_retries: int = 5):
	"""Load Quotation `qname`, call mutate(q), save — retrying on optimistic-lock
	clashes (MariaDB 1020) that happen when rapid +/- clicks fire concurrent
	saves. Each retry re-fetches a fresh copy and re-applies the mutation."""
	delay = 0.04
	for attempt in range(max_retries + 1):
		try:
			q = frappe.get_doc("Quotation", qname)
			mutate(q)
			q.flags.ignore_mandatory = True
			q.save(ignore_permissions=True)
			return q
		except Exception as e:
			msg = str(e).lower()
			lock_clash = ("1020" in msg) or ("has changed since last read" in msg) or ("timestampmismatch" in msg)
			if not lock_clash or attempt == max_retries:
				raise
			frappe.db.rollback()
			time.sleep(delay)
			delay *= 2


# ── Helpers ─────────────────────────────────────────────────────────────────

def _price_list(customer: str) -> str | None:
	"""Resolve the price list for this customer. Strict: Customer.default_price_list
	only (no group/site fallback). Returns None if not set."""
	return frappe.db.get_value("Customer", customer, "default_price_list") or None


def _rate_for(item_code: str, price_list: str | None, currency: str | None = None):
	"""Look up Item Price for (item_code, price_list). Returns dict or None.
	Field set is the conservative one — fancier fields like min_qty are checked
	dynamically because they may not exist on every Frappe/ERPNext install."""
	if not price_list or not item_code:
		return None
	filters = {"item_code": item_code, "price_list": price_list, "selling": 1}
	fields = ["price_list_rate", "currency", "uom"]
	if frappe.db.has_column("Item Price", "min_qty"):
		fields.append("min_qty")
	row = frappe.db.get_value("Item Price", filters, fields, as_dict=True)
	return dict(row) if row else None


def _rates_for(item_codes: list, price_list: str | None) -> dict:
	"""Batch Item Price lookup for many item codes (one query). Returns
	{item_code: {price_list_rate, currency, uom}}."""
	if not price_list or not item_codes:
		return {}
	rows = frappe.get_all(
		"Item Price",
		filters={"item_code": ["in", list(set(item_codes))], "price_list": price_list, "selling": 1},
		fields=["item_code", "price_list_rate", "currency", "uom"],
	) or []
	out = {}
	for r in rows:
		out.setdefault(r["item_code"], r)
	return out


def _farms_for_item(name: str) -> list[str]:
	"""Read tag-based farm names from Tag Link."""
	rows = frappe.get_all(
		"Tag Link",
		filters={"document_type": "Website Item", "document_name": name, "tag": ("like", "farm:%")},
		pluck="tag",
	) or []
	return [r.replace("farm:", "", 1) for r in rows]


def _in_season(name: str) -> bool:
	return bool(frappe.db.exists("Tag Link", {
		"document_type": "Website Item",
		"document_name": name,
		"tag": "in-season",
	}))


def _enrich(item_dict: dict, price_list: str | None, currency: str | None) -> dict:
	"""Add price + farms + in-season fields to a Website Item dict."""
	price = _rate_for(item_dict["item_code"], price_list, currency)
	item_dict["price_list_rate"] = price.get("price_list_rate") if price else None
	item_dict["price_currency"]  = price.get("currency") if price else None
	item_dict["price_uom"]       = price.get("uom") if price else None
	item_dict["min_qty"]         = price.get("min_qty") if price else None
	item_dict["farms"]    = _farms_for_item(item_dict["name"])
	item_dict["in_season"] = _in_season(item_dict["name"])
	return item_dict


def _open_draft_quotation(customer: str) -> str | None:
	"""Return the name of this customer's single open draft Quotation (cart)."""
	rows = frappe.get_all(
		"Quotation",
		filters={
			"party_name": customer,
			"quotation_to": "Customer",
			"docstatus": 0,
			"order_type": ("in", ("Sales", "Shopping Cart", None, "")),
		},
		fields=["name"],
		order_by="modified desc",
		limit_page_length=1,
	) or []
	return rows[0].name if rows else None


def _new_draft_quotation(customer: str):
	"""Build (in memory) a fresh draft Quotation for this customer's cart.
	Does NOT insert — the caller appends at least one item first, otherwise
	ERPNext's payment_schedule validator crashes on grand_total=None."""
	q = frappe.new_doc("Quotation")
	q.quotation_to = "Customer"
	q.party_name = customer
	q.order_type = "Sales"
	pl = _price_list(customer)
	if pl:
		q.selling_price_list = pl
		ccy = frappe.db.get_value("Price List", pl, "currency")
		if ccy:
			q.currency = ccy
	# Empty payment schedule + no template: dodges accounts_controller's
	# "grand_total * invoice_portion" path when grand_total starts at None.
	q.payment_terms_template = None
	q.payment_schedule = []
	q.flags.ignore_mandatory = True
	return q


# ── Catalog ─────────────────────────────────────────────────────────────────

@frappe.whitelist()
def list_categories(customer: str | None = None) -> list:
	"""Return Item Groups that have sellable items, with counts."""
	_resolve_customer(customer, allow_staff_unset=True)

	rows = frappe.db.sql("""
		SELECT item_group, COUNT(*) AS cnt
		FROM `tabItem`
		WHERE disabled = 0 AND is_sales_item = 1
		  AND has_variants = 0 AND item_group IN %(groups)s
		GROUP BY item_group
		ORDER BY cnt DESC, item_group ASC
	""", values={"groups": FLOWER_ITEM_GROUPS}, as_dict=True)
	return rows


@frappe.whitelist()
def list_farms(customer: str | None = None) -> list:
	"""Distinct farms across published Website Items, derived from tags."""
	_resolve_customer(customer, allow_staff_unset=True)

	rows = frappe.db.sql("""
		SELECT DISTINCT t.tag
		FROM `tabTag Link` t
		JOIN `tabWebsite Item` w ON w.name = t.document_name
		WHERE t.document_type = 'Website Item'
		  AND t.tag LIKE 'farm:%%'
		  AND w.published = 1
		ORDER BY t.tag ASC
	""", as_dict=True)
	return [r["tag"].replace("farm:", "", 1) for r in rows]


@frappe.whitelist()
def list_items(
	customer: str | None = None,
	category: str | None = None,
	search: str | None = None,
	farm: str | None = None,
	in_season: int | str | None = None,
	limit: int = 60,
) -> list:
	"""Filtered list of sellable Items with prices. Sourced from the Item master
	(templates + standalone; variant children are folded under their template),
	so the shop reflects the whole catalogue, not just curated Website Items."""
	cust = _resolve_customer(customer, allow_staff_unset=True)
	pl = _price_list(cust) if cust else None

	conditions = [
		"i.disabled = 0",
		"i.is_sales_item = 1",
		"i.has_variants = 0",
		"i.item_group IN %(groups)s",
	]
	values = {"groups": FLOWER_ITEM_GROUPS}
	if category:
		conditions.append("i.item_group = %(category)s")
		values["category"] = category
	if search:
		conditions.append("(i.item_name LIKE %(q)s OR i.item_code LIKE %(q)s)")
		values["q"] = f"%{search}%"
	if farm:
		conditions.append("""EXISTS (
			SELECT 1 FROM `tabTag Link` tl
			WHERE tl.document_name = i.name AND tl.tag = %(farm_tag)s
		)""")
		values["farm_tag"] = f"farm:{farm}"
	if in_season and str(in_season) not in ("0", "false", "False"):
		conditions.append("""EXISTS (
			SELECT 1 FROM `tabTag Link` tl
			WHERE tl.document_name = i.name AND tl.tag = 'in-season'
		)""")
	values["limit"] = int(limit)

	rows = frappe.db.sql(f"""
		SELECT i.name, i.item_code,
		       i.item_name AS web_item_name, i.item_name,
		       i.item_group, i.stock_uom, i.description, i.brand,
		       i.image AS website_image, i.image AS thumbnail,
		       NULL AS route, 0 AS ranking, i.has_variants
		FROM `tabItem` i
		WHERE {' AND '.join(conditions)}
		ORDER BY i.item_name ASC
		LIMIT %(limit)s
	""", values=values, as_dict=True)

	# Batch price + tag lookups (one query each) instead of per-row.
	rates = _rates_for([r["item_code"] for r in rows], pl)
	names = [r["name"] for r in rows]
	tags_by = {}
	if names:
		for t in frappe.get_all("Tag Link", filters={"document_name": ["in", names]},
		                        fields=["document_name", "tag"]) or []:
			tags_by.setdefault(t["document_name"], []).append(t["tag"])
	for r in rows:
		pr = rates.get(r["item_code"])
		r["price_list_rate"] = pr.get("price_list_rate") if pr else None
		r["price_currency"]  = pr.get("currency") if pr else None
		r["price_uom"]       = pr.get("uom") if pr else None
		r["min_qty"]         = None
		tgs = tags_by.get(r["name"], [])
		r["farms"]     = [t[5:] for t in tgs if t.startswith("farm:")]
		r["in_season"] = "in-season" in tgs
	return rows


@frappe.whitelist()
def get_item(name: str, customer: str | None = None) -> dict:
	"""Full Item detail + customer-specific price."""
	cust = _resolve_customer(customer, allow_staff_unset=True)
	pl = _price_list(cust) if cust else None

	it = frappe.db.get_value(
		"Item", name,
		["name", "item_code", "item_name", "item_group", "stock_uom",
		 "description", "image", "brand", "has_variants"],
		as_dict=True,
	)
	if not it:
		frappe.throw(_("This item is not available."), frappe.PermissionError)

	out = {
		"name": it.name,
		"item_code": it.item_code,
		"web_item_name": it.item_name,
		"item_name": it.item_name,
		"item_group": it.item_group,
		"stock_uom": it.stock_uom,
		"description": it.description,
		"web_long_description": it.description,
		"website_image": it.image,
		"thumbnail": it.image,
		"brand": it.brand,
		"route": None,
		"slideshow": None,
		"has_variants": it.has_variants,
	}
	rates = _rates_for([it.item_code], pl)
	pr = rates.get(it.item_code)
	out["price_list_rate"] = pr.get("price_list_rate") if pr else None
	out["price_currency"]  = pr.get("currency") if pr else None
	out["price_uom"]       = pr.get("uom") if pr else None
	out["min_qty"]         = None
	out["farms"]    = _farms_for_item(it.name)
	out["in_season"] = _in_season(it.name)
	return out


# ── Cart ────────────────────────────────────────────────────────────────────

def _format_cart_doc(qname: str) -> dict:
	"""Read a draft Quotation and return a cart-friendly view."""
	q = frappe.get_doc("Quotation", qname)
	items = []
	for r in (q.items or []):
		items.append({
			"item_code": r.item_code,
			"item_name": r.item_name,
			"qty":       float(r.qty or 0),
			"uom":       r.uom,
			"rate":      float(r.rate or 0),
			"amount":    float(r.amount or 0),
			"image":     getattr(r, "image", None),
			"web_name":  r.item_name,
		})
	return {
		"name": q.name,
		"currency": q.currency,
		"selling_price_list": q.selling_price_list,
		"items": items,
		"total_qty": sum(i["qty"] for i in items),
		"total":     float(q.grand_total or q.total or 0),
		"item_count": len(items),
	}


@frappe.whitelist()
def get_cart(customer: str | None = None) -> dict:
	# Staff with no impersonate set: return an empty cart stub instead of
	# 403'ing — the catalogue is browsable without a customer, but adding to
	# cart still requires one (handled in add_to_cart).
	cust = _resolve_customer(customer, allow_staff_unset=True)
	if not cust:
		return {"name": None, "currency": None, "selling_price_list": None, "items": [], "total_qty": 0, "total": 0, "item_count": 0}
	q = _open_draft_quotation(cust)
	if not q:
		pl = _price_list(cust)
		ccy = frappe.db.get_value("Price List", pl, "currency") if pl else None
		return {"name": None, "currency": ccy, "selling_price_list": pl, "items": [], "total_qty": 0, "total": 0, "item_count": 0}
	return _format_cart_doc(q)


def _row_for(item_code: str, qty: float, uom: str | None, price_list: str | None) -> dict:
	"""Build a Quotation Item row dict from an Item + price-list lookup."""
	meta = frappe.db.get_value(
		"Item", item_code,
		["item_name", "stock_uom", "description"],
		as_dict=True,
	) or {}
	row = {
		"item_code": item_code,
		"item_name": meta.get("item_name") or item_code,
		"description": meta.get("description") or meta.get("item_name") or item_code,
		"qty": qty,
		"uom": uom or meta.get("stock_uom") or "Nos",
		"conversion_factor": 1,
	}
	price = _rate_for(item_code, price_list)
	if price:
		row["rate"] = price.get("price_list_rate") or 0
		row["price_list_rate"] = price.get("price_list_rate") or 0
	return row


@frappe.whitelist()
def add_to_cart(item_code: str, qty: float = 1, uom: str | None = None, customer: str | None = None) -> dict:
	cust = _resolve_customer(customer)
	if not item_code:
		frappe.throw(_("Item code required."))
	qty = float(qty or 0)
	if qty <= 0:
		qty = 1

	qname = _open_draft_quotation(cust)

	if qname is None:
		# No open cart yet — build a new Quotation with this item as the FIRST
		# row. Avoids the empty-cart-validate crash (grand_total=None × payment
		# schedule percentages).
		q = _new_draft_quotation(cust)
		pl = q.selling_price_list or _price_list(cust)
		q.append("items", _row_for(item_code, qty, uom, pl))
		q.flags.ignore_mandatory = True
		q.insert(ignore_permissions=True)
		frappe.db.commit()
		return _format_cart_doc(q.name)

	def _add(q):
		existing = next((r for r in (q.items or []) if r.item_code == item_code), None)
		if existing:
			existing.qty = float(existing.qty or 0) + qty
		else:
			pl = q.selling_price_list or _price_list(cust)
			q.append("items", _row_for(item_code, qty, uom, pl))

	_mutate_quotation(qname, _add)
	frappe.db.commit()
	return _format_cart_doc(qname)


@frappe.whitelist()
def update_qty(item_code: str, qty: float, customer: str | None = None) -> dict:
	cust = _resolve_customer(customer)
	qname = _open_draft_quotation(cust)
	if not qname:
		frappe.throw(_("Cart is empty."))
	qty = float(qty or 0)

	def _update(q):
		rows_to_keep = []
		for r in (q.items or []):
			if r.item_code == item_code:
				if qty > 0:
					r.qty = qty
					rows_to_keep.append(r)
			else:
				rows_to_keep.append(r)
		q.items = rows_to_keep

	_mutate_quotation(qname, _update)
	frappe.db.commit()
	return _format_cart_doc(qname)


@frappe.whitelist()
def remove_item(item_code: str, customer: str | None = None) -> dict:
	return update_qty(item_code, 0, customer)


@frappe.whitelist()
def clear_cart(customer: str | None = None) -> dict:
	cust = _resolve_customer(customer)
	qname = _open_draft_quotation(cust)
	if not qname:
		return get_cart(customer)

	def _clear(q):
		q.items = []

	_mutate_quotation(qname, _clear)
	frappe.db.commit()
	return get_cart(customer)


# ── Checkout ────────────────────────────────────────────────────────────────

@frappe.whitelist()
def submit_quotation(notes: str | None = None, customer: str | None = None) -> dict:
	"""Submit the customer's draft Quotation so the sales team can convert it."""
	cust = _resolve_customer(customer)
	qname = _open_draft_quotation(cust)
	if not qname:
		frappe.throw(_("Your cart is empty."))

	q = frappe.get_doc("Quotation", qname)
	if not q.items:
		frappe.throw(_("Your cart is empty."))

	if notes:
		extra = f"\n\n— Customer note —\n{notes}"
		if getattr(q, "tc_name", None):  # avoid clobbering terms
			pass
		try:
			q.terms = (q.terms or "") + extra
		except Exception:
			pass

	try:
		q.submit()
		frappe.db.commit()
	except Exception as e:
		# If submit fails (e.g. validation), keep it as a draft and surface the error
		frappe.log_error(message=str(e), title="Customer Portal webshop submit_quotation")
		frappe.throw(_("Could not submit your request: {0}").format(str(e)))

	return {"name": q.name, "status": "Submitted"}


# ── Reorder: recent orders + saved profiles ──────────────────────────────────
#
# Flower buying is highly repetitive, so the shop lets a customer (a) reorder
# straight from a past order and (b) save the current cart as a named "quick-buy
# profile" they can drop back into the cart in one click.

def _sellable(item_code: str) -> bool:
	"""True if the item still exists and is sellable — guards reorder against
	items that were since disabled or deleted."""
	row = frappe.db.get_value("Item", item_code, ["disabled", "is_sales_item"], as_dict=True)
	return bool(row) and not row.disabled and row.is_sales_item


def _add_items_to_cart(cust: str, rows: list, replace: bool = False) -> tuple[dict, list]:
	"""Merge (item_code, qty, uom) rows into the customer's draft-Quotation cart.
	Skips items that are no longer sellable. Returns (cart_dict, skipped_codes)."""
	norm, skipped = [], []
	for it in rows:
		code = (it.get("item_code") or "").strip()
		if not code:
			continue
		if not _sellable(code):
			skipped.append(code)
			continue
		try:
			qty = float(it.get("qty") or 0)
		except Exception:
			qty = 0
		norm.append((code, qty if qty > 0 else 1, it.get("uom")))

	if not norm:
		return get_cart(cust), skipped

	qname = _open_draft_quotation(cust)
	if qname is None:
		q = _new_draft_quotation(cust)
		pl = q.selling_price_list or _price_list(cust)
		for code, qty, uom in norm:
			q.append("items", _row_for(code, qty, uom, pl))
		q.flags.ignore_mandatory = True
		q.insert(ignore_permissions=True)
		frappe.db.commit()
		return _format_cart_doc(q.name), skipped

	def _merge(q):
		pl = q.selling_price_list or _price_list(cust)
		if replace:
			q.items = []
		existing = {r.item_code: r for r in (q.items or [])}
		for code, qty, uom in norm:
			if code in existing:
				existing[code].qty = float(existing[code].qty or 0) + qty
			else:
				q.append("items", _row_for(code, qty, uom, pl))
				existing[code] = q.items[-1]

	_mutate_quotation(qname, _merge)
	frappe.db.commit()
	return _format_cart_doc(qname), skipped


@frappe.whitelist()
def list_recent_orders(customer: str | None = None, limit: int = 6) -> list:
	"""Recent Sales Orders for this customer, each with a short item preview, so
	the shop can offer one-click reordering."""
	cust = _resolve_customer(customer)
	orders = frappe.get_all(
		"Sales Order",
		filters={"customer": cust, "docstatus": ["!=", 2]},
		fields=["name", "transaction_date", "status", "grand_total", "currency", "total_qty"],
		order_by="transaction_date desc, creation desc",
		limit_page_length=int(limit),
	) or []
	for o in orders:
		items = frappe.get_all(
			"Sales Order Item",
			filters={"parent": o["name"]},
			fields=["item_code", "item_name", "qty", "uom"],
			order_by="idx",
		) or []
		o["item_count"] = len(items)
		o["items"] = items
	return orders


@frappe.whitelist()
def reorder_to_cart(source_doctype: str, source_name: str, replace: int | str = 0,
                    customer: str | None = None) -> dict:
	"""Copy the line items of a past Sales Order / Quotation into the cart."""
	cust = _resolve_customer(customer)
	if source_doctype not in ("Sales Order", "Quotation"):
		frappe.throw(_("Cannot reorder from {0}.").format(source_doctype))

	doc = frappe.get_doc(source_doctype, source_name)
	owner = doc.customer if source_doctype == "Sales Order" else doc.party_name
	if owner != cust and not _is_staff():
		frappe.throw(_("That order doesn't belong to your account."), frappe.PermissionError)

	rows = [{"item_code": r.item_code, "qty": r.qty, "uom": r.uom} for r in (doc.items or [])]
	cart, skipped = _add_items_to_cart(cust, rows, replace=str(replace) not in ("0", "", "false", "False"))
	cart["reordered"] = {"added": len(rows) - len(skipped), "skipped": skipped}
	return cart


# ── Saved quick-buy profiles ──────────────────────────────────────────────────

def _profile_items(name: str) -> list:
	return frappe.get_all(
		"Reorder Profile Item",
		filters={"parent": name, "parenttype": "Reorder Profile"},
		fields=["item_code", "item_name", "qty", "uom"],
		order_by="idx",
	) or []


@frappe.whitelist()
def list_reorder_profiles(customer: str | None = None) -> list:
	"""The customer's saved quick-buy profiles, most-recently-used first."""
	cust = _resolve_customer(customer)
	profs = frappe.get_all(
		"Reorder Profile",
		filters={"customer": cust},
		fields=["name", "profile_name", "notes", "last_used", "modified"],
		order_by="last_used desc, modified desc",
	) or []
	for p in profs:
		p["items"] = _profile_items(p["name"])
		p["item_count"] = len(p["items"])
	return profs


@frappe.whitelist()
def save_reorder_profile(profile_name: str, notes: str = "", customer: str | None = None) -> dict:
	"""Snapshot the current cart as a named quick-buy profile."""
	cust = _resolve_customer(customer)
	profile_name = (profile_name or "").strip()
	if not profile_name:
		frappe.throw(_("Give your profile a name."))

	cart = get_cart(cust)
	items = cart.get("items") or []
	if not items:
		frappe.throw(_("Your cart is empty — add items before saving a profile."))

	doc = frappe.new_doc("Reorder Profile")
	doc.profile_name = profile_name
	doc.customer = cust
	doc.notes = notes or ""
	doc.last_used = frappe.utils.now_datetime()
	for it in items:
		doc.append("items", {
			"item_code": it["item_code"],
			"item_name": it.get("item_name") or it["item_code"],
			"qty": it.get("qty") or 1,
			"uom": it.get("uom"),
		})
	doc.insert(ignore_permissions=True)
	frappe.db.commit()
	return {"name": doc.name, "profile_name": doc.profile_name, "item_count": len(items)}


@frappe.whitelist()
def load_reorder_profile(name: str, replace: int | str = 0, customer: str | None = None) -> dict:
	"""Drop a saved profile's items into the cart (merging by default)."""
	cust = _resolve_customer(customer)
	doc = frappe.get_doc("Reorder Profile", name)
	if doc.customer != cust and not _is_staff():
		frappe.throw(_("That profile doesn't belong to your account."), frappe.PermissionError)

	rows = [{"item_code": r.item_code, "qty": r.qty, "uom": r.uom} for r in (doc.items or [])]
	cart, skipped = _add_items_to_cart(cust, rows, replace=str(replace) not in ("0", "", "false", "False"))

	# Touch last_used so the profile floats to the top of the list next time.
	try:
		doc.db_set("last_used", frappe.utils.now_datetime(), update_modified=False)
		frappe.db.commit()
	except Exception:
		pass

	cart["reordered"] = {"added": len(rows) - len(skipped), "skipped": skipped}
	return cart


@frappe.whitelist()
def delete_reorder_profile(name: str, customer: str | None = None) -> dict:
	"""Delete one of the customer's saved profiles."""
	cust = _resolve_customer(customer)
	doc = frappe.get_doc("Reorder Profile", name)
	if doc.customer != cust and not _is_staff():
		frappe.throw(_("That profile doesn't belong to your account."), frappe.PermissionError)
	frappe.delete_doc("Reorder Profile", name, ignore_permissions=True)
	frappe.db.commit()
	return {"deleted": name}
