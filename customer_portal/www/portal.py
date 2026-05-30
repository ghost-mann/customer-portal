"""The /portal launcher has been retired — customers go straight to their
customer portal, and the webshop is reachable from there. Any hit on /portal
redirects accordingly.
"""

import frappe

no_cache = 1


def get_context(context):
	if frappe.session.user == "Guest":
		frappe.local.flags.redirect_location = "/login?redirect-to=/customer-portal"
	else:
		frappe.local.flags.redirect_location = "/customer-portal"
	raise frappe.Redirect
