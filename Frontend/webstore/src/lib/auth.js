export function isLoggedIn() {
  return !!window.logged_in;
}

export function requireLogin(returnTo = window.location.pathname) {
  const redirect = window.webshop_settings?.redirect_on_action || '/login';
  window.location.href = `${redirect}?redirect-to=${encodeURIComponent(returnTo)}`;
}
