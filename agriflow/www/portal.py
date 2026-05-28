"""Server-side boot context for the Agriflow portal SPA at /portal.

Unlike the CRM dashboard, /portal is reachable by Guest — guests see the
"Sign in" page. The boot data is best-effort; the React app re-checks the
real permissions via agriflow.api.portal.get_user_context.
"""

import frappe

no_cache = 1


def get_context(context):
	user = frappe.session.user
	is_guest = user == "Guest"
	full_name = None
	if not is_guest:
		full_name = frappe.db.get_value("User", user, "full_name") or user

	context.boot = {
		"csrf_token":       frappe.sessions.get_csrf_token(),
		"frappe_user":      user if not is_guest else None,
		"frappe_user_full": full_name,
		"is_guest":         is_guest,
	}
	return context
