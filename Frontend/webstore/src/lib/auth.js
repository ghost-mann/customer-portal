import { getGuestRedirectOnAction } from './api';

export function isLoggedIn() {
  return !!window.logged_in;
}

// Sends a guest to sign in, returning to `returnTo` afterwards. Prefers
// Webshop Settings' configured redirect (get_guest_redirect_on_action —
// same helper every other guest-gated action in this app already uses:
// Product.jsx, Cart.jsx, Wishlist.jsx, Reviews.jsx, BouquetComposer.jsx,
// Order.jsx), falling back to plain /login when that call fails or returns
// nothing (confirmed live: returns "" on this site). There is no
// `window.webshop_settings` any more — that was a leftover from the removed
// custom backend boot.
export async function requireLogin(returnTo = window.location.pathname) {
  const redirect = (await getGuestRedirectOnAction().catch(() => '')) || '/login';
  const target = `${redirect}${redirect.includes('?') ? '&' : '?'}redirect-to=${encodeURIComponent(returnTo)}`;
  window.location.href = target;
}
