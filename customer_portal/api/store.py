"""Public storefront adapter for the Upande Webstore SPA (/upande-webstore).

Backed entirely by the `upande_webshop` app's doctypes. Browsing methods are
guest-safe; mutating customer data (later phases) requires login. This module
NEVER reads the retired ERPNext Item/Item Price/Quotation shop path.
"""

import frappe


# ── Pure helpers ─────────────────────────────────────────────────────────────

def _price_range(rows):
    """rows: list of {rate, stock_qty}. Return (min_rate, max_rate, in_stock)."""
    rates = [r["rate"] for r in rows if r.get("rate") is not None]
    in_stock = any((r.get("stock_qty") or 0) > 0 for r in rows)
    if not rates:
        return None, None, in_stock
    return min(rates), max(rates), in_stock


def _stem_price_rows(item_code):
    """Read the stem_length_prices child rows for an Item code (parent-agnostic)."""
    name = frappe.db.get_value("Webshop Item Prices", {"item_code": item_code}, "name")
    if not name:
        return []
    doc = frappe.get_cached_doc("Webshop Item Prices", name)
    return [
        {"stem_length": r.stem_length, "rate": r.rate, "stock_qty": r.stock_qty}
        for r in (doc.stem_length_prices or [])
        if getattr(r, "enabled", 1)
    ]


def _default_currency():
    company = frappe.db.get_single_value("Webshop Settings", "company")
    if company:
        return frappe.db.get_value("Company", company, "default_currency") or "USD"
    return "USD"


def _hide_prices_for_guest():
    """True when the current session is Guest and Webshop Settings hides prices."""
    if frappe.session.user != "Guest":
        return False
    return bool(frappe.db.get_single_value("Webshop Settings", "hide_price_for_guest"))


def _card(web_item_name, hide_prices=False):
    """Normalize a Website Item into the canonical storefront card dict."""
    wi = frappe.db.get_value(
        "Website Item", web_item_name,
        ["name", "web_item_name", "item_name", "item_code", "item_group",
         "brand", "route", "website_image", "thumbnail", "short_description",
         "on_backorder"],
        as_dict=True,
    )
    if not wi:
        return None
    rows = _stem_price_rows(wi.item_code)
    pmin, pmax, in_stock = _price_range(rows)
    has_offer = bool(frappe.db.exists(
        "Website Offer", {"parenttype": "Website Item", "parent": web_item_name}))
    return {
        "name": wi.name,
        "web_item_name": wi.web_item_name or wi.item_name,
        "item_name": wi.item_name,
        "item_code": wi.item_code,
        "item_group": wi.item_group,
        "brand": wi.brand,
        "route": wi.route or f"/upande-webstore/product/{wi.name}",
        "image": wi.website_image,
        "thumbnail": wi.thumbnail or wi.website_image,
        "short_description": wi.short_description,
        "price_min": None if hide_prices else pmin,
        "price_max": None if hide_prices else pmax,
        "currency": _default_currency(),
        "in_stock": in_stock,
        "on_backorder": bool(wi.on_backorder),
        "stem_lengths": [] if hide_prices else [r["stem_length"] for r in rows],
        "has_offer": has_offer,
    }


# ── Whitelisted endpoints ────────────────────────────────────────────────────

@frappe.whitelist(allow_guest=True)
def get_settings():
    s = frappe.get_cached_doc("Webshop Settings")
    return {
        "hide_price_for_guest": bool(s.hide_price_for_guest),
        "guest_pricing": not bool(s.hide_price_for_guest),
        "login_required_to_view_products": bool(s.login_required_to_view_products),
        "enable_reviews": bool(s.enable_reviews),
        "enable_wishlist": bool(s.enable_wishlist),
        "enable_recommendations": bool(s.enable_recommendations),
        "show_stem_length": bool(s.show_stem_length),
        "show_box_type": bool(s.show_box_type),
        "show_stock_availability": bool(s.show_stock_availability),
        "show_price": bool(s.show_price),
        "products_per_page": int(s.products_per_page or 12),
        "enable_checkout": bool(s.enable_checkout),
        "show_bouquets_page": bool(s.show_bouquets_page),
        "show_apply_coupon_code": bool(s.show_apply_coupon_code_in_website),
        "redirect_on_action": s.redirect_on_action or "/login",
        "currency": _default_currency(),
    }


@frappe.whitelist(allow_guest=True)
def get_home():
    hide = _hide_prices_for_guest()

    # Featured — read the child rows directly (parent-agnostic), preserve order.
    feat_rows = frappe.get_all(
        "Homepage Featured Product",
        fields=["item_code"], order_by="idx asc", limit_page_length=0,
    )
    featured = [c for c in (_card(r.item_code, hide_prices=hide) for r in feat_rows) if c]

    # Offers — distinct offers across published Website Items.
    offer_rows = frappe.db.sql("""
        SELECT o.parent AS web_item, o.offer_title, o.offer_subtitle
        FROM `tabWebsite Offer` o
        JOIN `tabWebsite Item` w ON w.name = o.parent
        WHERE o.parenttype = 'Website Item' AND w.published = 1
        ORDER BY o.idx ASC LIMIT 8
    """, as_dict=True)
    offers = [{"item": r.web_item, "offer_title": r.offer_title,
               "offer_subtitle": r.offer_subtitle} for r in offer_rows]

    # Categories — item groups that have published website items.
    cat_rows = frappe.db.sql("""
        SELECT item_group, COUNT(*) AS count
        FROM `tabWebsite Item`
        WHERE published = 1 AND item_group IS NOT NULL
        GROUP BY item_group ORDER BY count DESC, item_group ASC LIMIT 12
    """, as_dict=True)
    categories = [{"item_group": r.item_group, "count": r.count} for r in cat_rows]

    # New arrivals — most recently published.
    na_rows = frappe.get_all(
        "Website Item", filters={"published": 1}, fields=["name"],
        order_by="creation desc", limit_page_length=8,
    )
    new_arrivals = [c for c in (_card(r.name, hide_prices=hide) for r in na_rows) if c]

    return {
        "featured": featured,
        "offers": offers,
        "categories": categories,
        "new_arrivals": new_arrivals,
    }
