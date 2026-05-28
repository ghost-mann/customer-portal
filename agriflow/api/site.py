"""Public site backend for the agriflow marketing pages.

These endpoints are reachable without authentication (allow_guest=True) so the
React marketing site can render for visitors.
"""

import json
import re

import frappe
from frappe import _


def _safe_parse_json(s, default):
	if not s:
		return default
	try:
		return json.loads(s)
	except Exception:
		return default


@frappe.whitelist(allow_guest=True)
def get_site_content() -> dict:
	"""Return everything the marketing site needs in one call: branding, hero,
	value props, about, stats, varieties, gallery, contact, social, footer."""
	try:
		s = frappe.get_single("Agriflow Site Settings")
	except frappe.DoesNotExistError:
		s = None

	def f(name, default=None):
		v = getattr(s, name, None) if s else None
		return v if v not in (None, "") else default

	stats = _safe_parse_json(f("stats", ""), [])

	value_props = []
	for r in (getattr(s, "value_props", None) or []) if s else []:
		value_props.append({
			"icon": r.icon or "spa",
			"title": r.title,
			"body": r.body or "",
		})

	varieties = []
	for r in (getattr(s, "varieties", None) or []) if s else []:
		varieties.append({
			"name": r.name1,
			"image": r.image,
			"category": r.category,
			"tagline": r.tagline,
		})

	gallery = []
	for r in (getattr(s, "gallery", None) or []) if s else []:
		gallery.append({
			"image": r.image,
			"caption": r.caption,
			"alt": r.alt_text or r.caption,
		})

	return {
		"brand": {
			"name": f("brand_name", "Agriflow"),
			"tagline": f("brand_tagline", "Farm-direct, every season"),
		},
		"hero": {
			"image": f("hero_image"),
			"eyebrow": f("hero_eyebrow", "FROM OUR FARMS"),
			"title": f("hero_title", "Fresh from the field, straight to you."),
			"subtitle": f("hero_subtitle",
				"Agriflow links you to a network of family-run farms across East Africa. "
				"Cut-to-order roses, hass avocados, specialty coffee — picked fresh, "
				"packed cold, shipped fast."),
			"cta_label": f("hero_cta_label", "See our catalogue"),
			"cta_link": f("hero_cta_link", "/varieties"),
		},
		"value_props": value_props,
		"about": {
			"image": f("about_image"),
			"eyebrow": f("about_eyebrow", "OUR STORY"),
			"title": f("about_title", "Generations of know-how."),
			"body": f("about_body",
				"<p>Our farms are run by people who grew up on them. Every variety we ship is "
				"chosen for how it travels, not just how it grows — and every consignment is "
				"checked by hand before it leaves the cold room.</p>"),
		},
		"stats": stats if isinstance(stats, list) else [],
		"varieties": {
			"intro": f("varieties_intro",
				"A rotating selection of what's in season across our farms."),
			"items": varieties,
		},
		"gallery": gallery,
		"contact": {
			"email": f("contact_email", "hello@upande.com"),
			"phone": f("contact_phone"),
			"address": f("contact_address"),
			"hours": f("contact_hours"),
		},
		"social": {
			"linkedin": f("social_linkedin"),
			"instagram": f("social_instagram"),
			"facebook": f("social_facebook"),
		},
		"footer": {
			"text": f("footer_text", "Agriflow · Upande Ltd"),
			"show_powered_by": int(f("show_powered_by", 1) or 0),
		},
	}


@frappe.whitelist(allow_guest=True)
def submit_contact_inquiry(payload=None, **kwargs) -> dict:
	"""Public contact-form submission. Creates a CRM Lead and emails the team."""
	if isinstance(payload, str):
		try: data = json.loads(payload)
		except Exception: data = {}
	else:
		data = payload or kwargs or {}

	name    = (data.get("name") or "").strip()
	email   = (data.get("email") or "").strip()
	phone   = (data.get("phone") or "").strip()
	company = (data.get("company") or "").strip()
	subject = (data.get("subject") or "Website inquiry").strip()
	message = (data.get("message") or "").strip()
	source  = data.get("source") or "Agriflow Site"

	# Light validation
	if not name or not email or not message:
		frappe.throw(_("Please fill your name, email, and message."))
	if not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", email):
		frappe.throw(_("Please enter a valid email address."))

	# Create a Lead (existing ERPNext / CRM doctype). Set the bare minimum so it
	# works whether Frappe CRM or ERPNext Selling is installed.
	lead = frappe.new_doc("Lead")
	lead.lead_name = name
	if hasattr(lead, "first_name"):
		parts = name.split(maxsplit=1)
		lead.first_name = parts[0]
		if len(parts) > 1: lead.last_name = parts[1]
	lead.email_id = email
	if phone:   lead.mobile_no = phone
	if company:
		if hasattr(lead, "company_name"): lead.company_name = company
		if hasattr(lead, "organization"): lead.organization = company
	if hasattr(lead, "source"):
		try: lead.source = "Website"
		except Exception: pass
	if hasattr(lead, "status"):
		try: lead.status = "Lead"
		except Exception: pass
	# Stash the message body somewhere visible
	notes = f"Subject: {subject}\n\n{message}\n\n— Submitted via {source}"
	if hasattr(lead, "notes"):
		lead.notes = notes
	elif hasattr(lead, "lead_owner_email"):
		# CRM Lead variant — append comment after insert
		pass

	try:
		lead.insert(ignore_permissions=True)
	except Exception as e:
		frappe.log_error(message=str(e), title="Agriflow contact inquiry insert failed")
		# Fall back to a ToDo for the admins
		todo = frappe.new_doc("ToDo")
		todo.description = (
			f"Website inquiry from {name} <{email}>\n\nSubject: {subject}\n\n{message}\n\n"
			f"Phone: {phone or '—'}\nCompany: {company or '—'}"
		)
		todo.priority = "Medium"
		todo.insert(ignore_permissions=True)
		frappe.db.commit()
		return {"name": todo.name, "kind": "ToDo"}

	# Attach the original message as a Comment on the Lead so account managers see it
	try:
		frappe.get_doc({
			"doctype": "Comment",
			"comment_type": "Comment",
			"reference_doctype": "Lead",
			"reference_name": lead.name,
			"content": f"<b>{subject}</b><br><br>{message}",
		}).insert(ignore_permissions=True)
	except Exception:
		pass

	frappe.db.commit()
	return {"name": lead.name, "kind": "Lead"}
