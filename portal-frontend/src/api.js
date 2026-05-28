export function getCsrfToken() {
  if (window.frappe?.csrf_token) return window.frappe.csrf_token;
  if (window.csrf_token) return window.csrf_token;
  const m = document.querySelector('meta[name="csrf_token"]');
  if (m && m.content && m.content !== '{{ csrf_token }}') return m.content;
  return '';
}

export async function api(method, args = {}) {
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
    method: 'POST',
    headers,
    credentials: 'same-origin',
    body: body.toString(),
  });
  let data = null;
  try { data = await res.json(); } catch (e) {}
  if (!res.ok) {
    const detail = data?._error_message || data?.exc_type || `HTTP ${res.status}`;
    throw new Error(detail);
  }
  return data?.message;
}

// Pull the boot context injected by the Jinja template (portal.py → boot dict).
export function getBoot() {
  return {
    user:        window.frappe_user        ?? window.user        ?? null,
    fullName:    window.frappe_user_full   ?? window.user_full   ?? null,
    csrfToken:   window.csrf_token         ?? null,
    isGuest:     window.is_guest           ?? true,
    tiles:       window.tiles              ?? null,
  };
}
