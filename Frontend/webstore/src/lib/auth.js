import { getBoot } from '@shared/api';

export function isLoggedIn() {
  return !!(getBoot?.().logged_in ?? window.logged_in);
}

export function requireLogin(returnTo = window.location.pathname) {
  const redirect = window.webshop_settings?.redirect_on_action || '/login';
  window.location.href = `${redirect}?redirect-to=${encodeURIComponent(returnTo)}`;
}
