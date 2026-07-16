import { useEffect, useState } from 'react';
import { useStore } from '../store';
import { getProductInfo, updateCart, getGuestRedirectOnAction, stashPendingCart } from '../lib/api';
import PriceBlock from './PriceBlock';
import QtyStepper from './QtyStepper';
import WishlistButton from './WishlistButton';

// A bouquet is sold as ONE Website Item (the `bouquet` field on each Bouquet
// Recipe Item row) — the recipe rows (item_group, stem_length, quantity) are
// its "what's inside" composition, not a multi-item cart builder (confirmed
// by reading www/bouquet/index.py + grepping for any bouquet-specific cart
// method — there is none). So "compose and add to cart" here means: show the
// stem breakdown for context, then add the bouquet's own item_code to the
// cart the same way Product.jsx does for any other product.
export default function BouquetComposer({ bouquet, onAdded, onViewDetails }) {
  const setCartCount = useStore((s) => s.setCartCount);
  const settings = useStore((s) => s.settings);

  const [productInfo, setProductInfo] = useState(null);
  const [infoLoading, setInfoLoading] = useState(false);
  const [qty, setQty] = useState(1);
  const [adding, setAdding] = useState(false);
  const [addResult, setAddResult] = useState(null);

  const item = bouquet.item; // matching Website Item from get_product_filter_data, or null

  useEffect(() => {
    setQty(1);
    setAddResult(null);
    if (!item || !item.item_code) { setProductInfo(null); return; }
    let cancelled = false;
    setInfoLoading(true);
    getProductInfo(item.item_code)
      .then((data) => { if (!cancelled) setProductInfo((data && data.product_info) || {}); })
      .catch(() => { if (!cancelled) setProductInfo({}); })
      .finally(() => { if (!cancelled) setInfoLoading(false); });
    return () => { cancelled = true; };
  }, [item && item.item_code]);

  const stockGated = Boolean(settings && settings.show_stock_availability);
  const outOfStock = Boolean(item) && stockGated && productInfo && productInfo.in_stock === false && !productInfo.on_backorder;
  const canAdd = Boolean(item && item.item_code) && !adding && !outOfStock && qty > 0;

  async function handleAddToCart() {
    if (!canAdd) return;
    setAdding(true);
    setAddResult(null);
    const entry = { item_code: item.item_code, qty };
    try {
      if (!window.logged_in) {
        await stashPendingCart([entry]);
        const redirect = (await getGuestRedirectOnAction().catch(() => '')) || '/login';
        const returnTo = window.location.pathname + window.location.search;
        window.location.href = `${redirect}${redirect.includes('?') ? '&' : '?'}redirect-to=${encodeURIComponent(returnTo)}`;
        return;
      }
      const res = await updateCart(entry);
      setCartCount(res && res.cart_count);
      setAddResult({ ok: true, message: `Added "${bouquet.name}" to your cart.` });
      if (onAdded) onAdded();
    } catch (e) {
      setAddResult({ ok: false, message: String(e) });
    } finally {
      setAdding(false);
    }
  }

  return (
    <div className="ws-bouquet-composer">
      <div className="ws-bouquet-composer-media">
        {item && item.website_image
          ? <img src={item.website_image} alt={bouquet.name} />
          : <span aria-hidden="true" className="material-symbols-outlined ws-card-ph">local_florist</span>}
      </div>

      <div className="ws-bouquet-composer-body">
        <div className="ws-pd-title-row">
          <h2 className="ws-pd-title">{bouquet.name}</h2>
          {item && settings && settings.enable_wishlist && (
            <WishlistButton itemCode={item.item_code} wished={item.wished} size="lg" />
          )}
        </div>

        {item ? (
          <PriceBlock settings={settings} productInfo={productInfo} loading={infoLoading} />
        ) : (
          <div className="ws-pd-hint">This bouquet's product listing isn't available right now.</div>
        )}

        <div className="ws-bouquet-recipe">
          <span className="ws-rail-title">What's inside</span>
          <table className="ws-bouquet-recipe-table">
            <thead>
              <tr>
                <th>Stem</th>
                <th>Length</th>
                <th>Qty</th>
              </tr>
            </thead>
            <tbody>
              {bouquet.rows.map((row, i) => (
                <tr key={i}>
                  <td>{row.item_group}</td>
                  <td>{row.stem_length || '—'}</td>
                  <td>{row.quantity}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="ws-bouquet-recipe-total">
            {bouquet.rows.length} ingredient{bouquet.rows.length === 1 ? '' : 's'} · {bouquet.totalStems} stem{bouquet.totalStems === 1 ? '' : 's'} per bouquet
          </div>
        </div>

        <div className="ws-pd-section ws-pd-add-row">
          <QtyStepper value={qty} onChange={setQty} disabled={adding || outOfStock || !item} />
          <button className="ws-btn-gold" disabled={!canAdd} onClick={handleAddToCart}>
            {!item ? 'Unavailable' : outOfStock ? 'Sold out' : adding ? 'Adding…' : 'Add bouquet to cart'}
          </button>
          {item && item.route && onViewDetails && (
            <button type="button" className="ws-rail-clear" onClick={() => onViewDetails(item.route)}>
              View full details
            </button>
          )}
        </div>

        {outOfStock && <div className="ws-pd-hint ws-pd-hint-bad">This bouquet is currently out of stock.</div>}

        {addResult && (
          <div className={`ws-pd-add-result ws-pd-add-result-${addResult.ok ? 'ok' : 'err'}`} role="status">
            {addResult.message}
          </div>
        )}
      </div>
    </div>
  );
}
