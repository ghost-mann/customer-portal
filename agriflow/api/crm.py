"""Whitelisted CRM dashboard endpoints backing the /crm React section.

Each `crm_dashboard_*` method returns plain dicts/lists in the exact shape the
frontend expects (see Frontend/crm/src/sections/*). Everything is defensive: a
missing doctype or column degrades to zero/empty rather than raising, so the
dashboard renders on any ERPNext/CRM install.

Access: gated to the same sales/CRM roles as the /crm page.
"""

import frappe
from frappe.utils import add_days, add_months, getdate, nowdate, flt

CRM_ROLES = {"System Manager", "Sales Manager", "Sales User", "CRM Manager", "CRM User"}


# ---------------------------------------------------------------- helpers
def _guard():
    if frappe.session.user == "Guest":
        frappe.throw("Login required", frappe.PermissionError)
    if not (set(frappe.get_roles(frappe.session.user)) & CRM_ROLES):
        frappe.throw("Not permitted", frappe.PermissionError)


def _has(doctype):
    try:
        return bool(frappe.db.exists("DocType", doctype))
    except Exception:
        return False


def _count(doctype, filters=None):
    try:
        return frappe.db.count(doctype, filters or {})
    except Exception:
        return 0


def _range(date_from, date_to):
    to = getdate(date_to) if date_to else getdate(nowdate())
    frm = getdate(date_from) if date_from else add_days(to, -30)
    return str(frm), str(to)


def _group(doctype, field, where_sql="", limit=8):
    """Top-N value counts for a Link/Select field → [{label, count}]."""
    if not _has(doctype):
        return []
    try:
        rows = frappe.db.sql(
            f"""select coalesce(nullif(`{field}`, ''), 'Unknown') as label, count(*) as count
                from `tab{doctype}` {where_sql}
                group by label order by count desc limit {int(limit)}""",
            as_dict=True,
        )
        return [{"label": r.label, "count": r.count} for r in rows]
    except Exception:
        return []


def _month_trend(doctype, datefield, months=12):
    if not _has(doctype):
        return []
    start = str(add_months(getdate(nowdate()), -(months - 1)).replace(day=1))
    try:
        rows = frappe.db.sql(
            f"""select date_format(`{datefield}`, '%%Y-%%m') as month, count(*) as count
                from `tab{doctype}` where `{datefield}` >= %s
                group by month order by month""",
            (start,), as_dict=True,
        )
        return [{"month": r.month, "count": r.count} for r in rows]
    except Exception:
        return []


# ---------------------------------------------------------------- overview
@frappe.whitelist()
def crm_dashboard_overview(date_from=None, date_to=None):
    _guard()
    frm30 = str(add_days(getdate(nowdate()), -30))

    # KPIs
    leads_total = _count("Lead")
    leads_conv = _count("Lead", {"status": "Converted"})
    leads_open = _count("Lead", {"status": ["in", ["Lead", "Open", "Replied", "Interested"]]})
    conv_rate = round((leads_conv / leads_total * 100), 1) if leads_total else 0

    opps_total = _count("Opportunity")
    opps_open = _count("Opportunity", {"status": ["in", ["Open", "Quotation", "Replied"]]})
    opps_won = _count("Opportunity", {"status": "Converted"})

    prosp_total = _count("Prospect")
    prosp_terr = 0
    if _has("Prospect"):
        try:
            prosp_terr = frappe.db.sql(
                "select count(distinct nullif(territory,'')) from `tabProspect`"
            )[0][0] or 0
        except Exception:
            prosp_terr = 0

    cust_active = _count("Customer", {"disabled": 0})
    cust_companies = _count("Customer", {"customer_type": "Company", "disabled": 0})

    rev_usd, rev_orders = 0, 0
    if _has("Sales Order"):
        try:
            r = frappe.db.sql(
                """select coalesce(sum(base_grand_total),0), count(*)
                   from `tabSales Order`
                   where docstatus=1 and transaction_date >= %s""",
                (frm30,),
            )[0]
            rev_usd, rev_orders = flt(r[0]), int(r[1])
        except Exception:
            pass

    tasks_open = _count("ToDo", {"status": "Open"})
    tasks_high = _count("ToDo", {"status": "Open", "priority": "High"})

    kpis = {
        "leads": {"total": leads_total, "open": leads_open, "conv_rate": conv_rate},
        "opps": {"total": opps_total, "open": opps_open, "won": opps_won},
        "prosp": {"total": prosp_total, "territories": prosp_terr},
        "cust": {"active": cust_active, "companies": cust_companies},
        "revenue_30d": {"usd": rev_usd, "orders": rev_orders},
        "tasks": {"open": tasks_open, "high": tasks_high},
    }

    funnel = [
        {"label": "Leads", "count": leads_total},
        {"label": "Opportunities", "count": opps_total},
        {"label": "Quotations", "count": _count("Quotation") if _has("Quotation") else 0},
        {"label": "Sales Orders", "count": _count("Sales Order", {"docstatus": 1})},
        {"label": "Converted", "count": opps_won},
    ]

    return {
        "kpis": kpis,
        "funnel": funnel,
        "lead_status": _group("Lead", "status"),
        "lead_trend": _month_trend("Lead", "creation", 12),
        "so_trend": _month_trend("Sales Order", "transaction_date", 6),
        "top_sources": _group("Lead", "source"),
        "top_territories": _group("Lead", "territory"),
        "sales_stages": _group("Opportunity", "sales_stage"),
    }


# ---------------------------------------------------------------- customers (daily SO trend)
@frappe.whitelist()
def crm_dashboard_customers(date_from=None, date_to=None):
    _guard()
    frm, to = _range(date_from, date_to)
    trend = []
    if _has("Sales Order"):
        try:
            rows = frappe.db.sql(
                """select transaction_date as date, count(*) as count,
                          coalesce(sum(base_grand_total),0) as revenue
                   from `tabSales Order`
                   where docstatus=1 and transaction_date between %s and %s
                   group by transaction_date order by transaction_date""",
                (frm, to), as_dict=True,
            )
            trend = [{"date": str(r.date), "count": r.count, "revenue": flt(r.revenue)} for r in rows]
        except Exception:
            trend = []
    return {
        "sales_order_trend": trend,
        "kpis": {
            "active": _count("Customer", {"disabled": 0}),
            "companies": _count("Customer", {"customer_type": "Company", "disabled": 0}),
        },
        "by_territory": _group("Customer", "territory", "where disabled=0"),
    }


# ---------------------------------------------------------------- other sections (basic real data)
@frappe.whitelist()
def crm_dashboard_leads(date_from=None, date_to=None):
    _guard()
    total = _count("Lead")
    return {
        "kpis": {
            "total": total,
            "open": _count("Lead", {"status": ["in", ["Lead", "Open", "Replied", "Interested"]]}),
            "converted": _count("Lead", {"status": "Converted"}),
        },
        "by_status": _group("Lead", "status"),
        "by_source": _group("Lead", "source"),
        "by_territory": _group("Lead", "territory"),
        "trend": _month_trend("Lead", "creation", 12),
    }


@frappe.whitelist()
def crm_dashboard_opportunities(date_from=None, date_to=None):
    _guard()
    return {
        "kpis": {
            "total": _count("Opportunity"),
            "open": _count("Opportunity", {"status": ["in", ["Open", "Quotation", "Replied"]]}),
            "won": _count("Opportunity", {"status": "Converted"}),
            "lost": _count("Opportunity", {"status": "Lost"}),
        },
        "by_status": _group("Opportunity", "status"),
        "by_stage": _group("Opportunity", "sales_stage"),
        "by_territory": _group("Opportunity", "territory"),
    }


@frappe.whitelist()
def crm_dashboard_prospects(date_from=None, date_to=None):
    _guard()
    return {
        "kpis": {"total": _count("Prospect")},
        "by_territory": _group("Prospect", "territory"),
        "by_industry": _group("Prospect", "industry"),
    }


@frappe.whitelist()
def crm_dashboard_events_tasks(date_from=None, date_to=None):
    _guard()
    return {
        "kpis": {
            "events": _count("Event"),
            "todos_open": _count("ToDo", {"status": "Open"}),
            "todos_high": _count("ToDo", {"status": "Open", "priority": "High"}),
        },
        "todos_by_priority": _group("ToDo", "priority", "where status='Open'"),
    }


@frappe.whitelist()
def crm_dashboard_activity(date_from=None, date_to=None):
    _guard()
    rows = []
    if _has("Communication"):
        try:
            rows = frappe.get_all(
                "Communication",
                filters={"communication_type": "Communication"},
                fields=["subject", "communication_date", "reference_doctype", "sender"],
                order_by="communication_date desc", limit=50,
            )
        except Exception:
            rows = []
    return {"kpis": {"recent": len(rows)}, "rows": rows}
