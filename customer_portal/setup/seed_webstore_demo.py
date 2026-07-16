"""Idempotent local demo data for the Upande Webstore.

Run: bench --site kaitet.local execute customer_portal.setup.seed_webstore_demo.seed_webstore_demo
Only for dev/verification on a bench without a real farm catalogue.
"""

import frappe

_GROUP = "Webstore Demo Flowers"
_ITEMS = [
    # (item_code, item_name, stem prices [(length, rate, stock)])
    ("WEBDEMO-ROSE-RED", "Red Naomi Rose", [("40cm", 0.35, 500), ("50cm", 0.42, 400), ("60cm", 0.55, 250)]),
    ("WEBDEMO-ROSE-WHT", "Avalanche White Rose", [("50cm", 0.40, 300), ("60cm", 0.52, 180)]),
    ("WEBDEMO-SPRAY-PK", "Pink Spray Rose", [("40cm", 0.30, 220), ("50cm", 0.38, 140)]),
]


def _ensure_group():
    if not frappe.db.exists("Item Group", _GROUP):
        frappe.get_doc({
            "doctype": "Item Group", "item_group_name": _GROUP,
            "parent_item_group": "All Item Groups", "is_group": 0,
        }).insert(ignore_permissions=True)


def _ensure_item(code, name):
    if not frappe.db.exists("Item", code):
        frappe.get_doc({
            "doctype": "Item", "item_code": code, "item_name": name,
            "item_group": _GROUP, "stock_uom": "Nos", "is_sales_item": 1,
            "is_stock_item": 0,
        }).insert(ignore_permissions=True)


def _ensure_website_item(code, name):
    existing = frappe.db.get_value("Website Item", {"item_code": code}, "name")
    if existing:
        return existing
    doc = frappe.get_doc({
        "doctype": "Website Item", "item_code": code, "web_item_name": name,
        "item_name": name, "item_group": _GROUP, "stock_uom": "Nos",
        "published": 1, "short_description": f"Fresh {name} from the farm.",
        "web_long_description": f"<p>Premium {name}, cut to order.</p>",
    }).insert(ignore_permissions=True)
    return doc.name


def _ensure_prices(code, name, stems):
    existing = frappe.db.get_value("Webshop Item Prices", {"item_code": code}, "name")
    doc = frappe.get_doc("Webshop Item Prices", existing) if existing else frappe.new_doc("Webshop Item Prices")
    doc.item_code = code
    doc.item_name = name
    doc.item_group = _GROUP
    doc.currency = "USD"
    doc.set("stem_length_prices", [])
    for length, rate, stock in stems:
        doc.append("stem_length_prices", {"stem_length": length, "rate": rate, "stock_qty": stock, "enabled": 1})
    doc.flags.ignore_mandatory = True
    doc.save(ignore_permissions=True)


def seed_webstore_demo():
    _ensure_group()
    web_names = []
    for code, name, stems in _ITEMS:
        _ensure_item(code, name)
        wname = _ensure_website_item(code, name)
        _ensure_prices(code, name, stems)
        web_names.append((wname, name))

    # Featured products: read the child table directly (parent-agnostic) and
    # rebuild it on whatever singleton holds it if present; else skip silently.
    featured = 0
    for wname, name in web_names[:2]:
        if not frappe.db.exists("Homepage Featured Product", {"item_code": wname}):
            try:
                frappe.get_doc({
                    "doctype": "Homepage Featured Product", "item_code": wname,
                    "item_name": name,
                    "parenttype": "Webshop Settings", "parent": "Webshop Settings",
                    "parentfield": "homepage_featured_products",
                }).insert(ignore_permissions=True)
                featured += 1
            except Exception:
                frappe.db.rollback()

    # One offer on the first website item.
    first_wi = web_names[0][0]
    wi = frappe.get_doc("Website Item", first_wi)
    if not wi.get("offers"):
        wi.append("offers", {"offer_title": "Farm Fresh Week", "offer_subtitle": "10% off long stems"})
        wi.save(ignore_permissions=True)

    # Settings toggles for a rich storefront.
    s = frappe.get_single("Webshop Settings")
    s.enabled = 1
    s.show_price = 1
    s.show_stem_length = 1
    s.enable_wishlist = 1
    s.enable_reviews = 1
    s.enable_recommendations = 1
    s.products_per_page = 12
    s.save(ignore_permissions=True)

    frappe.db.commit()
    return {"website_items": len(web_names), "featured": featured, "offers": 1}
