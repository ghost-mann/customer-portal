"""Webshop backend for the agriflow customer-facing /website-shop SPA.

Backed by ERPNext's Website Item + Item Price + Quotation. One open draft
Quotation per customer acts as their persistent cart. Tags on Website Item
provide the farm (tag prefix "farm:") and "in-season" filters.

Auth model: identical to agriflow.api.customer — every method scopes to the
Customer linked to the current user. Staff users may impersonate.
"""

import frappe
from frappe import _

from agriflow.api.customer import _resolve_customer, _is_staff


# ── Helpers ─────────────────────────────────────────────────────────────────

def _price_list(customer: str) -> str | None:
	"""Resolve the price list for this customer. Strict: Customer.default_price_list
	only (no group/site fallback). Returns None if not set."""
	return frappe.db.get_value("Customer", customer, "default_price_list") or None


def _rate_for(item_code: str, price_list: str | None, currency: str | None = None):
	"""Look up Item Price for (item_code, price_list). Returns dict or None."""
	if not price_list or not item_code:
		return None
	filters = {"item_code": item_code, "price_list": price_list, "selling": 1}
	row = frappe.db.get_value(
		"Item Price", filters,
		["price_list_rate", "currency", "uom", "min_qty"],
		as_dict=True,
	)
	return dict(row) if row else None


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


def _create_draft_quotation(customer: str) -> str:
	"""Open a fresh draft Quotation for this customer's cart."""
	q = frappe.new_doc("Quotation")
	q.quotation_to = "Customer"
	q.party_name = customer
	# customer_name auto-populates on save
	q.order_type = "Sales"
	# Currency + selling price list from customer if set
	pl = _price_list(customer)
	if pl:
		q.selling_price_list = pl
		ccy = frappe.db.get_value("Price List", pl, "currency")
		if ccy:
			q.currency = ccy
	q.flags.ignore_mandatory = True
	q.insert(ignore_permissions=True)
	frappe.db.commit()
	return q.name


def _ensure_cart(customer: str) -> str:
	return _open_draft_quotation(customer) or _create_draft_quotation(customer)


# ── Catalog ─────────────────────────────────────────────────────────────────

@frappe.whitelist()
def list_categories(customer: str | None = None) -> list:
	"""Return Item Groups that have published Website Items, with counts."""
	_resolve_customer(customer, allow_staff_unset=True)

	rows = frappe.db.sql("""
		SELECT item_group, COUNT(*) AS cnt
		FROM `tabWebsite Item`
		WHERE published = 1 AND IFNULL(item_group, '') != ''
		GROUP BY item_group
		ORDER BY cnt DESC, item_group ASC
	""", as_dict=True)
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
	"""Filtered list of published Website Items with prices + tags."""
	cust = _resolve_customer(customer, allow_staff_unset=True)
	pl = _price_list(cust) if cust else None

	conditions = ["w.published = 1"]
	values = {}
	if category:
		conditions.append("w.item_group = %(category)s")
		values["category"] = category
	if search:
		conditions.append("(w.web_item_name LIKE %(q)s OR w.item_code LIKE %(q)s OR w.item_name LIKE %(q)s)")
		values["q"] = f"%{search}%"
	if farm:
		conditions.append("""EXISTS (
			SELECT 1 FROM `tabTag Link` tl
			WHERE tl.document_type = 'Website Item' AND tl.document_name = w.name
			  AND tl.tag = %(farm_tag)s
		)""")
		values["farm_tag"] = f"farm:{farm}"
	if in_season and str(in_season) not in ("0", "false", "False"):
		conditions.append("""EXISTS (
			SELECT 1 FROM `tabTag Link` tl
			WHERE tl.document_type = 'Website Item' AND tl.document_name = w.name
			  AND tl.tag = 'in-season'
		)""")
	values["limit"] = int(limit)

	rows = frappe.db.sql(f"""
		SELECT w.name, w.item_code, w.web_item_name, w.item_name,
		       w.item_group, w.stock_uom, w.description, w.brand,
		       w.website_image, w.thumbnail, w.route, w.ranking, w.has_variants
		FROM `tabWebsite Item` w
		WHERE {' AND '.join(conditions)}
		ORDER BY w.ranking DESC, w.modified DESC
		LIMIT %(limit)s
	""", values=values, as_dict=True)

	# Enrich each with price + tags
	ccy = None
	for r in rows:
		_enrich(r, pl, ccy)
	return rows


@frappe.whitelist()
def get_item(name: str, customer: str | None = None) -> dict:
	"""Full Website Item detail + customer-specific price."""
	cust = _resolve_customer(customer, allow_staff_unset=True)
	pl = _price_list(cust) if cust else None

	doc = frappe.get_doc("Website Item", name)
	if not doc.published:
		frappe.throw(_("This item is not available."), frappe.PermissionError)
	d = doc.as_dict()
	# Trim heavy fields and add enrichment
	out = {
		"name": d.get("name"),
		"item_code": d.get("item_code"),
		"web_item_name": d.get("web_item_name") or d.get("item_name"),
		"item_name": d.get("item_name"),
		"item_group": d.get("item_group"),
		"stock_uom": d.get("stock_uom"),
		"description": d.get("description"),
		"web_long_description": d.get("web_long_description"),
		"website_image": d.get("website_image"),
		"thumbnail": d.get("thumbnail"),
		"brand": d.get("brand"),
		"route": d.get("route"),
		"slideshow": d.get("slideshow"),
		"has_variants": d.get("has_variants"),
	}
	_enrich(out, pl, None)
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


@frappe.whitelist()
def add_to_cart(item_code: str, qty: float = 1, uom: str | None = None, customer: str | None = None) -> dict:
	cust = _resolve_customer(customer)
	if not item_code:
		frappe.throw(_("Item code required."))
	qty = float(qty or 0)
	if qty <= 0:
		qty = 1

	qname = _ensure_cart(cust)
	q = frappe.get_doc("Quotation", qname)

	# Look up the Item for defaults (uom, name)
	item_meta = frappe.db.get_value(
		"Item", item_code,
		["item_name", "stock_uom", "image", "description"],
		as_dict=True,
	) or {}

	# Find existing row → increment, else append
	existing = next((r for r in (q.items or []) if r.item_code == item_code), None)
	if existing:
		existing.qty = float(existing.qty or 0) + qty
	else:
		row = q.append("items", {
			"item_code": item_code,
			"item_name": item_meta.get("item_name") or item_code,
			"description": item_meta.get("description") or item_meta.get("item_name") or item_code,
			"qty": qty,
			"uom": uom or item_meta.get("stock_uom") or "Nos",
			"conversion_factor": 1,
		})
		# Price from price list, if set
		pl = q.selling_price_list or _price_list(cust)
		price = _rate_for(item_code, pl)
		if price:
			row.rate = price.get("price_list_rate") or 0
			row.price_list_rate = price.get("price_list_rate") or 0

	q.flags.ignore_mandatory = True
	q.flags.ignore_validate = True
	q.save(ignore_permissions=True)
	frappe.db.commit()
	return _format_cart_doc(q.name)


@frappe.whitelist()
def update_qty(item_code: str, qty: float, customer: str | None = None) -> dict:
	cust = _resolve_customer(customer)
	qname = _open_draft_quotation(cust)
	if not qname:
		frappe.throw(_("Cart is empty."))
	q = frappe.get_doc("Quotation", qname)
	qty = float(qty or 0)
	rows_to_keep = []
	for r in (q.items or []):
		if r.item_code == item_code:
			if qty > 0:
				r.qty = qty
				rows_to_keep.append(r)
			# else: drop it
		else:
			rows_to_keep.append(r)
	q.items = rows_to_keep
	q.flags.ignore_mandatory = True
	q.save(ignore_permissions=True)
	frappe.db.commit()
	return _format_cart_doc(q.name)


@frappe.whitelist()
def remove_item(item_code: str, customer: str | None = None) -> dict:
	return update_qty(item_code, 0, customer)


@frappe.whitelist()
def clear_cart(customer: str | None = None) -> dict:
	cust = _resolve_customer(customer)
	qname = _open_draft_quotation(cust)
	if not qname:
		return get_cart(customer)
	q = frappe.get_doc("Quotation", qname)
	q.items = []
	q.flags.ignore_mandatory = True
	q.save(ignore_permissions=True)
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
		frappe.log_error(message=str(e), title="Agriflow webshop submit_quotation")
		frappe.throw(_("Could not submit your request: {0}").format(str(e)))

	return {"name": q.name, "status": "Submitted"}
