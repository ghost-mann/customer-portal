"""Server-side boot context for the Agriflow CRM dashboard at /crm.

Requires login + a sales/CRM role. Boot exposes the csrf token + user info; the
React app loads everything else via the crm_dashboard_* whitelisted methods.
"""

import frappe
from frappe import _

no_cache = 1

# Mirrors agriflow.api.portal.CRM_ROLES — who may see the sales CRM.
CRM_ROLES = {"System Manager", "Sales Manager", "Sales User", "CRM Manager", "CRM User"}


def get_context(context):
	if frappe.session.user == "Guest":
		frappe.throw(_("Please sign in to access the CRM."), frappe.PermissionError)

	roles = set(frappe.get_roles(frappe.session.user))
	if not (roles & CRM_ROLES):
		frappe.throw(_("You do not have access to the CRM."), frappe.PermissionError)

	context.boot = {
		"csrf_token":       frappe.sessions.get_csrf_token(),
		"frappe_user":      frappe.session.user,
		"frappe_user_full": frappe.db.get_value("User", frappe.session.user, "full_name") or frappe.session.user,
	}
	return context
