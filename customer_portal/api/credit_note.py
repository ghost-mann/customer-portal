"""Auto-link credit notes to their claim.

A claim (Customer Feedback) is raised against a Sales Invoice (the claim's
`sales_invoice`). A credit note is a Sales Invoice with `is_return=1` whose
`return_against` points at that original invoice. When such a credit note is
submitted we link it back onto every claim raised against the original invoice
(and roll up the credited total); on cancel we unlink it again.

Wired via `doc_events` on Sales Invoice in hooks.py. Safe no-ops when the
Customer Feedback doctype or its credit-note fields aren't present.
"""

import frappe

CLAIM_DT = "Customer Feedback"


def _claims_for_invoice(invoice: str | None) -> list:
	"""Claim names raised against `invoice` (the original Sales Invoice)."""
	if not invoice or not frappe.db.exists("DocType", CLAIM_DT):
		return []
	meta = frappe.get_meta(CLAIM_DT)
	if not meta.has_field("sales_invoice"):
		return []
	return frappe.get_all(CLAIM_DT, filters={"sales_invoice": invoice}, pluck="name") or []


def _note_list(claim) -> list:
	"""Credit-note names currently recorded on the claim (one per line)."""
	return [n.strip() for n in (getattr(claim, "credit_note_numbers", "") or "").splitlines() if n.strip()]


def _resync(claim, names: list) -> None:
	"""Write the credit-note list back and recompute the link + credited total.
	Idempotent — derives everything from `names`."""
	if hasattr(claim, "credit_note_numbers"):
		claim.credit_note_numbers = "\n".join(names)
	# Single Link field = the first (primary) credit note, or cleared.
	if hasattr(claim, "credit_note"):
		claim.credit_note = names[0] if names else None
	# Credited total = sum of the return invoices' values (returns are negative).
	if hasattr(claim, "total_credit_amount"):
		total = 0.0
		for n in names:
			gt = frappe.db.get_value("Sales Invoice", n, "grand_total")
			if gt is not None:
				total += abs(gt)
		claim.total_credit_amount = total


def _apply(doc, add: bool) -> None:
	"""Add/remove credit note `doc` on every claim against its return_against."""
	if not int(getattr(doc, "is_return", 0) or 0):
		return
	for claim_name in _claims_for_invoice(getattr(doc, "return_against", None)):
		claim = frappe.get_doc(CLAIM_DT, claim_name)
		names = _note_list(claim)
		present = doc.name in names
		if add and not present:
			names.append(doc.name)
		elif not add and present:
			names = [n for n in names if n != doc.name]
		else:
			continue  # nothing to change for this claim
		_resync(claim, names)
		claim.save(ignore_permissions=True)


def link_credit_note_to_claim(doc, method=None):
	"""Sales Invoice on_submit: link the credit note to its claim(s)."""
	_apply(doc, add=True)


def unlink_credit_note_from_claim(doc, method=None):
	"""Sales Invoice on_cancel: unlink the credit note from its claim(s)."""
	_apply(doc, add=False)
