import { useEffect, useState } from 'react';
import { brand } from '../brand';
import { useRoute } from '../router';
import { useStore } from '../store';
import { isLoggedIn, getPortalHref } from '../lib/auth';

// Nav mirrors upande_webshop's own storefront structure (Shop / Bouquets /
// Wishlist / Cart / Orders), gated the same way the pages themselves gate —
// Bouquets on settings.show_bouquets_page, Wishlist on settings.enable_wishlist
// — plus the two RT7 user requirements: a prominent top-right "Customer
// Portal" link, and live cart/wishlist counts sourced straight from the store
// (no local state, no polling — the same counters Cart/Product/WishlistButton
// already keep current on every mutation).
export default function Nav() {
  const { navigate, page } = useRoute();
  const settings = useStore((s) => s.settings);
  const cartCount = useStore((s) => s.cartCount);
  const wishlistCount = useStore((s) => s.wishlistCount);
  const loggedIn = isLoggedIn();
  const [menuOpen, setMenuOpen] = useState(false);

  // Close the mobile menu on route changes so it never survives a navigation.
  useEffect(() => { setMenuOpen(false); }, [page]);

  const showBouquets = Boolean(settings && settings.show_bouquets_page);
  const showWishlist = Boolean(settings && settings.enable_wishlist);
  const showWishlistCount = loggedIn && showWishlist && Number(wishlistCount) > 0;

  // Static per the RT7 requirement — logged-in goes straight to the portal,
  // a guest is sent through /login with a redirect back to it. This is a
  // fixed destination, not a cart/wishlist-style guest *action*, so it does
  // not go through get_guest_redirect_on_action() (that helper is for
  // resuming an in-progress add-to-cart/wishlist/review action, not a plain
  // nav link — see lib/auth.js's requireLogin for the action-redirect path).
  const portalHref = getPortalHref();

  function go(path) {
    setMenuOpen(false);
    navigate(path);
  }

  return (
    <header className="ws-nav">
      <div className="ws-brand">
        {/* The logo image is a real link to the Frappe Desk — a full
           navigation (not the SPA router), since /app is a different
           application entirely. It's a plain anchor (not onClick+
           window.location.href) so middle-click, Ctrl/Cmd-click, and
           "copy link" all work as expected. The wordmark stays a router
           link back to the storefront home, so both destinations remain
           reachable from the same brand lockup. */}
        <a
          className="ws-brand-logo-btn"
          href="/app"
          aria-label="Open Desk"
        >
          <img className="ws-brand-logo" src="/assets/upande_webshop/images/UpandeLogo.png" alt="Upande" />
        </a>
        <button type="button" className="ws-brand-name-btn" onClick={() => go('/')}>
          <span className="ws-brand-name">{brand.name}</span>
        </button>
      </div>

      <button
        type="button"
        className="ws-nav-toggle"
        aria-label={menuOpen ? 'Close menu' : 'Open menu'}
        aria-expanded={menuOpen}
        aria-controls="ws-nav-links"
        onClick={() => setMenuOpen((v) => !v)}
      >
        <span className="material-symbols-outlined" aria-hidden="true">{menuOpen ? 'close' : 'menu'}</span>
      </button>

      <nav
        id="ws-nav-links"
        className={`ws-nav-links${menuOpen ? ' ws-nav-links-open' : ''}`}
        aria-label="Storefront"
      >
        <button onClick={() => go('/shop')}>Shop</button>
        {showBouquets && <button onClick={() => go('/bouquets')}>Bouquets</button>}
        {showWishlist && (
          <button onClick={() => go('/wishlist')}>
            Wishlist{showWishlistCount ? ` (${wishlistCount})` : ''}
          </button>
        )}
        {/* In-SPA order history (pages/Orders.jsx) — a real router navigation
           like every other nav entry here, not an anchor out to erpnext's own
           /orders page. Only meaningful for a signed-in shopper (list_orders
           is login-gated, same as Cart/Wishlist), so gated the same way. */}
        {loggedIn && <button onClick={() => go('/orders')}>Orders</button>}
      </nav>

      <div className="ws-nav-right">
        <a className="ws-portal-link" href={portalHref}>
          <span className="material-symbols-outlined" aria-hidden="true">account_circle</span>
          <span className="ws-portal-link-label">Customer Portal</span>
        </a>
        <button
          type="button"
          className="ws-cart"
          onClick={() => go('/cart')}
          aria-label={`Cart, ${cartCount} item${cartCount === 1 ? '' : 's'}`}
        >
          <span className="material-symbols-outlined" aria-hidden="true">shopping_bag</span>
          <span className="ws-cart-count" aria-hidden="true">{cartCount}</span>
        </button>
      </div>
    </header>
  );
}
