"""Server-side context for the Agripulse portal landing page.

Computes which tiles the logged-in user can see, based on their roles and
their link to a Customer record. The tiles are:

  - customer: enabled when the user has a Customer linked via Contact, or
    the System Manager / Customer role. Routes to /customer-portal.
  - crm:      enabled for the sales team. Routes to /customer-relationship-management.
  - webshop:  enabled for anyone with a Customer link or "Customer" role.
              Routes to /shop.

System Manager always sees all tiles (for admin demos and onboarding).
"""

import frappe

# Roles that grant CRM (sales team) access.
CRM_ROLES = {"System Manager", "Sales Manager", "Sales User", "CRM Manager", "CRM User"}

# Roles that grant Customer Panel access (besides "has a linked Customer record").
CUSTOMER_PANEL_ROLES = {"System Manager", "Customer"}

# Routes — change here if any of the destination apps move.
ROUTE_CUSTOMER = "/customer-portal"
ROUTE_CRM      = "/customer-relationship-management"
ROUTE_WEBSHOP  = "/website-shop"


def _user_has_customer(user: str) -> bool:
	"""True if the user is linked to a Customer record via Contact."""
	if not user or user == "Guest":
		return False
	# Frappe Contact.links → child table "Dynamic Link" with link_doctype/link_name.
	# A user becomes a "customer contact" when their Contact has a Dynamic Link
	# pointing to a Customer.
	contact = frappe.db.get_value("Contact", {"user": user}, "name")
	if not contact:
		return False
	return bool(frappe.db.exists("Dynamic Link", {
		"parenttype": "Contact",
		"parent": contact,
		"link_doctype": "Customer",
	}))


@frappe.whitelist(allow_guest=True)
def get_user_context() -> dict:
	"""Return the current user's identity + per-tile permissions."""
	user = frappe.session.user
	is_guest = user == "Guest"

	if is_guest:
		return {
			"is_guest": True,
			"user": None,
			"full_name": None,
			"tiles": None,
		}

	roles = set(frappe.get_roles(user))
	full_name = frappe.db.get_value("User", user, "full_name") or user
	has_customer = _user_has_customer(user)

	can_crm      = bool(roles & CRM_ROLES)
	can_customer = bool(roles & CUSTOMER_PANEL_ROLES) or has_customer
	can_webshop  = can_customer or "Customer" in roles or has_customer

	def tile(enabled: bool, href: str, reason: str = None):
		return {
			"enabled": enabled,
			"href": href if enabled else None,
			"reason": reason if not enabled else None,
		}

	return {
		"is_guest": False,
		"user": user,
		"full_name": full_name,
		"roles": sorted(roles),
		"tiles": {
			"customer": tile(
				can_customer,
				ROUTE_CUSTOMER,
				"Available once your customer account is approved.",
			),
			"crm": tile(
				can_crm,
				ROUTE_CRM,
				"Sales team only.",
			),
			"webshop": tile(
				can_webshop,
				ROUTE_WEBSHOP,
				"Available to active customers.",
			),
		},
	}


def get_user_home_page(user):
	"""Login landing page for website users — straight to the customer portal
	(the /portal launcher is retired). Wired via the get_website_user_home_page
	hook in hooks.py."""
	return "/customer-portal"
