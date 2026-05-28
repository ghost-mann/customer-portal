// Frappe API client for the customer portal.
//
// CSRF handling: Frappe enforces CSRF on POST. The token is injected into the
// page via the Jinja boot block and exposed on window.csrf_token. If the
// page has been open long enough that the token has rotated (or the session
// changed in another tab), the first API call returns CSRFTokenError. We
// recover by GET-fetching a fresh token from agriflow.api.customer.get_csrf_token
// and retrying the original call once.

export function getCsrfToken() {
  if (window.frappe?.csrf_token) return window.frappe.csrf_token;
  if (window.csrf_token) return window.csrf_token;
  const m = document.querySelector('meta[name="csrf_token"]');
  if (m && m.content && m.content !== '{{ csrf_token }}') return m.content;
  return '';
}

function setCsrfToken(tok) {
  if (tok) window.csrf_token = tok;
}

function isCsrfError(err, data) {
  const s = String(err?.message || data?.exc_type || data?._error_message || '').toLowerCase();
  return s.includes('csrf');
}

let _refreshInflight = null;
async function refreshCsrf() {
  if (_refreshInflight) return _refreshInflight;
  _refreshInflight = (async () => {
    try {
      const res = await fetch('/api/method/agriflow.api.customer.get_csrf_token', {
        method: 'GET',
        credentials: 'same-origin',
        headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
      });
      if (!res.ok) return false;
      const d = await res.json();
      const tok = d?.message?.csrf_token;
      if (tok) {
        setCsrfToken(tok);
        return true;
      }
    } catch (e) {}
    return false;
  })();
  try { return await _refreshInflight; }
  finally { _refreshInflight = null; }
}

async function callForm(method, args = {}) {
  const csrf = getCsrfToken();
  const body = new URLSearchParams();
  for (const k in args) if (args[k] != null) body.append(k, args[k]);
  if (csrf) body.append('csrf_token', csrf);
  const headers = {
    'Content-Type': 'application/x-www-form-urlencoded',
    'X-Requested-With': 'XMLHttpRequest',
    Accept: 'application/json',
  };
  if (csrf) headers['X-Frappe-CSRF-Token'] = csrf;
  const res = await fetch('/api/method/' + method, {
    method: 'POST', headers, credentials: 'same-origin', body: body.toString(),
  });
  let data = null;
  try { data = await res.json(); } catch (e) {}
  return { ok: res.ok, status: res.status, data };
}

async function callJson(method, payload) {
  const csrf = getCsrfToken();
  const headers = {
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
    Accept: 'application/json',
  };
  if (csrf) headers['X-Frappe-CSRF-Token'] = csrf;
  const res = await fetch('/api/method/' + method, {
    method: 'POST', headers, credentials: 'same-origin', body: JSON.stringify(payload || {}),
  });
  let data = null;
  try { data = await res.json(); } catch (e) {}
  return { ok: res.ok, status: res.status, data };
}

function detailFrom(r) {
  return r.data?._error_message || r.data?.exc_type || `HTTP ${r.status}`;
}

export async function api(method, args = {}) {
  let r = await callForm(method, args);
  if (!r.ok && isCsrfError(null, r.data)) {
    if (await refreshCsrf()) {
      r = await callForm(method, args);
    }
  }
  if (!r.ok) throw new Error(detailFrom(r));
  return r.data?.message;
}

export async function apiPost(method, payload) {
  let r = await callJson(method, payload);
  if (!r.ok && isCsrfError(null, r.data)) {
    if (await refreshCsrf()) {
      r = await callJson(method, payload);
    }
  }
  if (!r.ok) throw new Error(detailFrom(r));
  return r.data?.message;
}
