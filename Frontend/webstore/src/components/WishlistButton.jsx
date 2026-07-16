import { useEffect, useState } from 'react';
import { addToWishlist, removeFromWishlist, getGuestRedirectOnAction } from '../lib/api';
import { useStore } from '../store';

// Heart toggle used on ProductCard + Product detail. `wished` is the item's
// current flag from get_product_filter_data; toggling updates local UI state
// optimistically, calls the confirmed add/remove wishlist method, and
// reconciles (reverts) on failure. Both methods are login-required (confirmed
// live — see lib/api.js) so a guest is sent through the same
// get_guest_redirect_on_action() -> /login?redirect-to=<here> path RT3/RT4 use
// for cart mutations, instead of ever calling the wishlist API as a guest.
export default function WishlistButton({ itemCode, wished, className = '', size }) {
  const setItemWished = useStore((s) => s.setItemWished);
  const [localWished, setLocalWished] = useState(Boolean(wished));
  const [busy, setBusy] = useState(false);

  useEffect(() => { setLocalWished(Boolean(wished)); }, [wished, itemCode]);

  async function toggle(e) {
    e.preventDefault();
    e.stopPropagation();
    if (busy || !itemCode) return;

    if (!window.logged_in) {
      const redirect = (await getGuestRedirectOnAction().catch(() => '')) || '/login';
      const returnTo = window.location.pathname + window.location.search;
      window.location.href = `${redirect}${redirect.includes('?') ? '&' : '?'}redirect-to=${encodeURIComponent(returnTo)}`;
      return;
    }

    const next = !localWished;
    setLocalWished(next);
    setItemWished(itemCode, next);
    setBusy(true);
    try {
      if (next) await addToWishlist(itemCode);
      else await removeFromWishlist(itemCode);
    } catch (err) {
      // Reconcile: the mutation failed server-side, revert the optimistic flip.
      setLocalWished(!next);
      setItemWished(itemCode, !next);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      className={`ws-wish-btn${localWished ? ' ws-wish-btn-active' : ''}${size ? ` ws-wish-btn-${size}` : ''} ${className}`.trim()}
      onClick={toggle}
      disabled={busy}
      aria-pressed={localWished}
      aria-label={localWished ? 'Remove from wishlist' : 'Add to wishlist'}
      title={localWished ? 'Remove from wishlist' : 'Add to wishlist'}
    >
      <span aria-hidden="true" className="material-symbols-outlined">
        {localWished ? 'favorite' : 'favorite_border'}
      </span>
    </button>
  );
}
