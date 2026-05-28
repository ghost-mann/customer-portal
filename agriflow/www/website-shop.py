"""Server-side boot for the Agriflow customer webshop at /website-shop.
Requires login. Guests are redirected via the React app's bootstrap error.
"""

import frappe
from frappe import _

no_cache = 1


def get_context(context):
	if frappe.session.user == "Guest":
		frappe.throw(_("Please sign in to access the webshop."), frappe.PermissionError)

	context.boot = {
		"csrf_token":       frappe.sessions.get_csrf_token(),
		"frappe_user":      frappe.session.user,
		"frappe_user_full": frappe.db.get_value("User", frappe.session.user, "full_name") or frappe.session.user,
	}
	return context
