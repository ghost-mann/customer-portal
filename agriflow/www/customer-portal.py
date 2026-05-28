"""Server-side boot context for the Agriflow customer portal at /customer-portal.

Requires login. Boot exposes csrf token + user info; the rest of the data
is loaded by the React app via agriflow.api.customer.* methods.
"""

import frappe
from frappe import _

no_cache = 1


def get_context(context):
	if frappe.session.user == "Guest":
		frappe.throw(_("Please sign in to access the customer portal."), frappe.PermissionError)

	context.boot = {
		"csrf_token":       frappe.sessions.get_csrf_token(),
		"frappe_user":      frappe.session.user,
		"frappe_user_full": frappe.db.get_value("User", frappe.session.user, "full_name") or frappe.session.user,
	}
	return context
