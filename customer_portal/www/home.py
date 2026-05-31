"""Server-side boot for the Customer Portal public marketing SPA.

Same template is served at /, /home, /about, /varieties, /contact via
website_route_rules in hooks.py. Guests are allowed; the React app reads
window.location.pathname to choose which page to render.
"""

import frappe

from customer_portal.api.customer import _is_staff, _is_crm, _is_account_manager

no_cache = 1


def get_context(context):
	user = frappe.session.user
	is_guest = user == "Guest"
	context.boot = {
		"csrf_token":       frappe.sessions.get_csrf_token(),
		"frappe_user":      user if not is_guest else None,
		"frappe_user_full": frappe.db.get_value("User", user, "full_name") if not is_guest else None,
		"is_guest":         is_guest,
		"is_staff":           False if is_guest else _is_staff(),
		"is_crm":             False if is_guest else _is_crm(),
		"is_account_manager": False if is_guest else _is_account_manager(),
	}
	return context
