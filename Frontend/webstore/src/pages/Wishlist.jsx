import { useEffect, useState } from 'react';
import { useRoute } from '../router';
import { useStore } from '../store';
import ProductImage from '../components/ProductImage';
import {
  getWishlistItems,
  removeFromWishlist,
  updateCart,
  getGuestRedirectOnAction,
} from '../lib/api';

// `/upande-webstore/wishlist` — lists the signed-in user's wished items.
// There is no dedicated whitelisted "list my wishlist" method (confirmed by
// grep — see lib/api.js getWishlistItems' comment), so this re-walks
// get_product_filter_data and keeps items flagged `wished`. Wishlist itself
// is login-required (add_to_wishlist/remove_from_wishlist both 403 for a
// guest — confirmed live), so this page shows the same sign-in state Cart.jsx
// uses for guests instead of ever calling the wishlist API unauthenticated.
export default function Wishlist() {
  const { navigate } = useRoute();
  const settings = useStore((s) => s.settings);
  const setCartCount = useStore((s) => s.setCartCount);
  const setItemWished = useStore((s) => s.setItemWished);
  const setWishlistCount = useStore((s) => s.setWishlistCount);

  const loggedIn = Boolean(window.logged_in);
  const enableWishlist = Boolean(settings && settings.enable_wishlist);

  const [items, setItems] = useState(null); // null = loading
  const [error, setError] = useState(null);
  const [busyCode, setBusyCode] = useState(null);
  const [moveResult, setMoveResult] = useState(null); // { ok, message }

  async function load() {
    setError(null);
    try {
      const rows = await getWishlistItems();
      setItems(rows);
    } catch (e) {
      setError(String(e));
      setItems([]);
    }
  }

  useEffect(() => {
    if (!loggedIn || !enableWishlist) { setItems([]); return; }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loggedIn, enableWishlist]);

  async function handleRemove(item) {
    setBusyCode(item.item_code);
    try {
      const res = await removeFromWishlist(item.item_code);
      setWishlistCount(res && res.wish_count);
      setItemWished(item.item_code, false);
      setItems((prev) => (prev || []).filter((i) => i.item_code !== item.item_code));
    } catch (e) {
      setError(String(e));
    } finally {
      setBusyCode(null);
    }
  }

  // Templates (has_variants) can't go straight into the cart — the shopper
  // must pick a length/attribute first (mirrors upande_webshop's own
  // wishlist.html + set_variant_flag in templates/pages/wishlist.py) — so
  // those route to the product page instead of calling update_cart directly.
  // The cart-add is the half that must be authoritative: once updateCart
  // succeeds the item really is in the cart, so we report success and only
  // *attempt* the wishlist-removal as cleanup. If that cleanup throws, the
  // move still succeeded (don't tell the user it failed — that invited a
  // duplicate add on retry); we just note the wishlist wasn't cleared. The
  // wishlist is always reloaded from the server in `finally` so the UI never
  // drifts from real state, regardless of which half failed.
  async function handleMoveToCart(item) {
    if (item.has_variants) { navigate(`/p/${item.route}`); return; }
    setBusyCode(item.item_code);
    setMoveResult(null);
    try {
      const res = await updateCart({ item_code: item.item_code, qty: 1 });
      setCartCount(res && res.cart_count);

      try {
        const rmv = await removeFromWishlist(item.item_code);
        setWishlistCount(rmv && rmv.wish_count);
        setItemWished(item.item_code, false);
      } catch (removeErr) {
        // Added to cart already succeeded; a failed wishlist-removal is a
        // soft note, not a failure of the overall action.
        setMoveResult({
          ok: true,
          message: `Added "${item.web_item_name}" to your cart. (Couldn't remove it from your wishlist — it may still show here.)`,
        });
        return;
      }

      setMoveResult({ ok: true, message: `Added "${item.web_item_name}" to your cart.` });
    } catch (e) {
      setMoveResult({ ok: false, message: String(e) });
    } finally {
      setBusyCode(null);
      await load();
    }
  }

  if (!loggedIn) {
    return (
      <div className="ws-shop ws-cart-page">
        <div className="ws-empty ws-cart-guest">
          <h1 className="ws-pd-title">Sign in to view your wishlist</h1>
          <p>Your wishlist is saved to your account. Sign in to see the items you've saved.</p>
          <button
            className="ws-btn-gold"
            onClick={async () => {
              const redirect = (await getGuestRedirectOnAction().catch(() => '')) || '/login';
              const returnTo = '/upande-webstore/wishlist';
              window.location.href = `${redirect}${redirect.includes('?') ? '&' : '?'}redirect-to=${encodeURIComponent(returnTo)}`;
            }}
          >
            Sign in
          </button>
        </div>
      </div>
    );
  }

  if (!enableWishlist) {
    return (
      <div className="ws-shop ws-cart-page">
        <div className="ws-empty">
          <h1 className="ws-pd-title">Wishlist unavailable</h1>
          <p>The wishlist isn't enabled on this store right now.</p>
          <button className="ws-btn-gold" onClick={() => navigate('/shop')}>Back to Shop</button>
        </div>
      </div>
    );
  }

  if (items === null) {
    return <div className="ws-shop"><div className="boot">Loading your wishlist…</div></div>;
  }

  if (error && items.length === 0) {
    return (
      <div className="ws-shop">
        <div className="boot">
          <h1>Could not load your wishlist</h1>
          <p>{error}</p>
          <button className="ws-btn-gold" onClick={load}>Retry</button>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="ws-shop ws-cart-page">
        <div className="ws-empty ws-cart-empty">
          <h1 className="ws-pd-title">Your wishlist is empty</h1>
          <p>Tap the heart on any item to save it here for later.</p>
          <button className="ws-btn-gold" onClick={() => navigate('/shop')}>Shop now</button>
        </div>
      </div>
    );
  }

  return (
    <div className="ws-shop ws-cart-page">
      <div className="ws-section-hd">
        <h1>Your Wishlist</h1>
        <span className="ws-section-count">{items.length} item{items.length === 1 ? '' : 's'}</span>
      </div>

      {moveResult && (
        <div className={`ws-pd-add-result ws-pd-add-result-${moveResult.ok ? 'ok' : 'err'}`} role="status">
          {moveResult.message}
        </div>
      )}

      <div className="ws-grid ws-wishlist-grid">
        {items.map((item) => {
          const busy = busyCode === item.item_code;
          return (
            <div className="ws-card ws-wish-card" key={item.item_code}>
              <button className="ws-wish-card-link" onClick={() => navigate(`/p/${item.route}`)}>
                <div className="ws-card-img">
                  <ProductImage
                    src={item.website_image}
                    alt={item.web_item_name}
                    placeholder={<span aria-hidden="true" className="material-symbols-outlined ws-card-ph">local_florist</span>}
                  />
                  {(item.on_backorder || item.in_stock === false) && (
                    <span className="ws-badge ws-badge-muted">{item.on_backorder ? 'Backorder' : 'Sold out'}</span>
                  )}
                </div>
                <div className="ws-card-body">
                  <div className="ws-card-name">{item.web_item_name}</div>
                  <div className="ws-card-group">{item.item_group}</div>
                </div>
              </button>
              <div className="ws-wish-card-actions">
                <button
                  className="ws-btn-gold ws-wish-card-add"
                  disabled={busy}
                  onClick={() => handleMoveToCart(item)}
                >
                  {busy ? 'Please wait…' : item.has_variants ? 'Choose options' : 'Move to cart'}
                </button>
                <button
                  className="ws-rail-clear ws-wish-card-remove"
                  disabled={busy}
                  onClick={() => handleRemove(item)}
                >
                  Remove
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
