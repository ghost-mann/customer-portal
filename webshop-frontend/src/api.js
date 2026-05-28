// Same CSRF auto-refresh + retry pattern as the customer panel.

export function getCsrfToken() {
  if (window.frappe?.csrf_token) return window.frappe.csrf_token;
  if (window.csrf_token) return window.csrf_token;
  return '';
}
function setCsrfToken(tok) { if (tok) window.csrf_token = tok; }
function isCsrfError(data) {
  const s = String(data?.exc_type || data?._error_message || '').toLowerCase();
  return s.includes('csrf');
}

let _refresh = null;
async function refreshCsrf() {
  if (_refresh) return _refresh;
  _refresh = (async () => {
    try {
      const r = await fetch('/api/method/agriflow.api.customer.get_csrf_token', {
        method: 'GET', credentials: 'same-origin',
        headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
      });
      const d = await r.json();
      if (d?.message?.csrf_token) { setCsrfToken(d.message.csrf_token); return true; }
    } catch (e) {}
    return false;
  })();
  try { return await _refresh; } finally { _refresh = null; }
}

async function call(method, args, asJson) {
  const csrf = getCsrfToken();
  const headers = { 'X-Requested-With': 'XMLHttpRequest', Accept: 'application/json' };
  let body;
  if (asJson) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(args || {});
  } else {
    headers['Content-Type'] = 'application/x-www-form-urlencoded';
    const p = new URLSearchParams();
    for (const k in args) if (args[k] != null) p.append(k, args[k]);
    if (csrf) p.append('csrf_token', csrf);
    body = p.toString();
  }
  if (csrf) headers['X-Frappe-CSRF-Token'] = csrf;
  const res = await fetch('/api/method/' + method, {
    method: 'POST', headers, credentials: 'same-origin', body,
  });
  let data = null; try { data = await res.json(); } catch (e) {}
  return { ok: res.ok, status: res.status, data };
}

function detailFrom(r) {
  return r.data?._error_message || r.data?.exc_type || `HTTP ${r.status}`;
}

export async function api(method, args = {}) {
  let r = await call(method, args, false);
  if (!r.ok && isCsrfError(r.data)) {
    if (await refreshCsrf()) r = await call(method, args, false);
  }
  if (!r.ok) throw new Error(detailFrom(r));
  return r.data?.message;
}

export async function apiGet(method, query = {}) {
  const qs = new URLSearchParams();
  for (const k in query) if (query[k] != null) qs.append(k, query[k]);
  const url = '/api/method/' + method + (qs.toString() ? '?' + qs.toString() : '');
  const res = await fetch(url, {
    method: 'GET', credentials: 'same-origin',
    headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
  });
  let data = null; try { data = await res.json(); } catch (e) {}
  if (!res.ok) throw new Error(data?._error_message || `HTTP ${res.status}`);
  return data?.message;
}
