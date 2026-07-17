"""Backfill the homepage visibility toggles to ON for existing installs.

The `enable_custom_homepage` / `show_*` fields on Customer Portal Site Settings
ship with `default: 1`, but Frappe only applies field defaults when a Single is
first created. On sites where the Single already existed before these fields
were added, the new Check fields read back as 0 — which would silently hide the
whole marketing homepage after upgrade. This one-time patch restores the
previous behaviour (everything visible). A Check reads as 0 whether it was left
unset or deliberately switched off, so the two can't be told apart — but since
the feature is brand new, no deliberate choice exists yet and forcing them ON is
safe.
"""

import frappe

TOGGLES = [
	"enable_custom_homepage",
	"show_hero",
	"show_value_props",
	"show_about",
	"show_stats",
	"show_varieties",
	"show_gallery",
	"show_contact",
	"show_social",
]


def execute():
	if not frappe.db.exists("DocType", "Customer Portal Site Settings"):
		return
	for field in TOGGLES:
		frappe.db.set_single_value("Customer Portal Site Settings", field, 1)
