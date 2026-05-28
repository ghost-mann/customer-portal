export function getCsrfToken() {
  if (window.frappe?.csrf_token) return window.frappe.csrf_token;
  if (window.csrf_token) return window.csrf_token;
  return '';
}

export async function apiGet(method) {
  const res = await fetch('/api/method/' + method, {
    method: 'GET',
    credentials: 'same-origin',
    headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
  });
  if (!res.ok) {
    let d = null; try { d = await res.json(); } catch (e) {}
    throw new Error(d?._error_message || `HTTP ${res.status}`);
  }
  const data = await res.json();
  return data?.message;
}

export async function apiPost(method, payload) {
  const csrf = getCsrfToken();
  const headers = {
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
    Accept: 'application/json',
  };
  if (csrf) headers['X-Frappe-CSRF-Token'] = csrf;
  const res = await fetch('/api/method/' + method, {
    method: 'POST', headers, credentials: 'same-origin',
    body: JSON.stringify(payload || {}),
  });
  let data = null; try { data = await res.json(); } catch (e) {}
  if (!res.ok) {
    throw new Error(data?._error_message || data?.exc_type || `HTTP ${res.status}`);
  }
  return data?.message;
}
