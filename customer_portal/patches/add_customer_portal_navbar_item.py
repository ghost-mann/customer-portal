"""Add a "Customer Portal" link to the website navbar (Website Settings top bar).

This lets the navbar entry travel with the customer_portal app rather than being
hard-coded into another app's navbar template. Idempotent — safe to re-run.
"""

import frappe

LABEL = "Customer Portal"
URL = "/customer-portal"


def execute():
	ws = frappe.get_single("Website Settings")
	for row in ws.top_bar_items or []:
		if (row.url or "").rstrip("/") == URL or row.label == LABEL:
			return  # already present
	ws.append("top_bar_items", {"label": LABEL, "url": URL})
	ws.save(ignore_permissions=True)
	frappe.db.commit()
