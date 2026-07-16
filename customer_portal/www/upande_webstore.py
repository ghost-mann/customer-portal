"""Server-side boot for the Upande Webstore public SPA at /upande-webstore.

Guests allowed. Internal storefront subpaths (/upande-webstore/shop, /product/..,
/cart, ..) are aliased to this template by website_route_rules in hooks.py; the
React app reads window.location.pathname to choose the page.

No app-specific data is fetched here — the SPA sources everything (items,
filters, settings) directly from upande_webshop's own whitelisted APIs
(see Frontend/webstore/src/lib/api.js). This file only supplies session glue.
"""

import frappe

no_cache = 1


def get_context(context):
	user = frappe.session.user
	is_guest = user == "Guest"
	context.boot = {
		"csrf_token":       frappe.sessions.get_csrf_token(),
		"frappe_user":      None if is_guest else user,
		"frappe_user_full": None if is_guest else (frappe.db.get_value("User", user, "full_name") or user),
		"logged_in":        not is_guest,
	}
	return context
