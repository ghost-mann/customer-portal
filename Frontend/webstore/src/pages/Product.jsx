import { useEffect, useState } from 'react';
import { useRoute } from '../router';
import { useStore } from '../store';
import {
  getProductByRoute,
  getProductInfo,
  getBoxItems,
  updateCart,
  getGuestRedirectOnAction,
  stashPendingCart,
} from '../lib/api';
import Gallery from '../components/Gallery';
import PriceBlock from '../components/PriceBlock';
import QtyStepper from '../components/QtyStepper';
import StemLengthSelector from '../components/StemLengthSelector';
import WishlistButton from '../components/WishlistButton';
import Reviews from '../components/Reviews';

// Product detail: resolve the Website Item by its route, price/stock it via
// get_product_info_for_website, optionally run the has_variants attribute
// picker to resolve a concrete item_code, then add-to-cart.
export default function Product() {
  const { params, navigate } = useRoute();
  const route = params.route;
  const settings = useStore((s) => s.settings);
  const setCartCount = useStore((s) => s.setCartCount);

  const [product, setProduct] = useState(undefined); // undefined = loading, null = not found
  const [loadError, setLoadError] = useState(null);

  // The item actually priced / added to cart — the template item_code for a
  // plain item, or the resolved variant item_code once the picker lands on
  // exactly one match.
  const [resolvedItemCode, setResolvedItemCode] = useState(null);
  const [productInfo, setProductInfo] = useState(null);
  const [infoLoading, setInfoLoading] = useState(false);

  const [boxItems, setBoxItems] = useState([]);
  const [selectedBoxType, setSelectedBoxType] = useState('');
  const [qty, setQty] = useState(1);

  const [adding, setAdding] = useState(false);
  const [addResult, setAddResult] = useState(null); // { ok, message }

  // Load the product whenever the route param changes.
  useEffect(() => {
    let cancelled = false;
    setProduct(undefined);
    setLoadError(null);
    setResolvedItemCode(null);
    setProductInfo(null);
    setAddResult(null);
    setQty(1);
    setSelectedBoxType('');
    if (!route) { setProduct(null); return; }
    getProductByRoute(route)
      .then((item) => {
        if (cancelled) return;
        setProduct(item);
        if (item && !item.has_variants) setResolvedItemCode(item.item_code);
      })
      .catch((e) => { if (!cancelled) { setProduct(null); setLoadError(String(e)); } });
    return () => { cancelled = true; };
  }, [route]);

  // Box type dropdown — guest-safe list of names only (pack rate / bunch size
  // helpers require login; see lib/api.js getBoxItems comment).
  useEffect(() => {
    if (!settings || !settings.show_box_type) return;
    let cancelled = false;
    getBoxItems()
      .then((rows) => { if (!cancelled) setBoxItems(rows || []); })
      .catch(() => { if (!cancelled) setBoxItems([]); });
    return () => { cancelled = true; };
  }, [settings && settings.show_box_type]);

  // Price/stock for whichever item_code is currently resolved.
  useEffect(() => {
    if (!resolvedItemCode) { setProductInfo(null); return; }
    let cancelled = false;
    setInfoLoading(true);
    getProductInfo(resolvedItemCode)
      .then((data) => { if (!cancelled) setProductInfo((data && data.product_info) || {}); })
      .catch(() => { if (!cancelled) setProductInfo({}); })
      .finally(() => { if (!cancelled) setInfoLoading(false); });
    return () => { cancelled = true; };
  }, [resolvedItemCode]);

  if (product === undefined) {
    return <div className="ws-shop"><div className="boot">Loading…</div></div>;
  }
  if (product === null) {
    return (
      <div className="ws-shop">
        <div className="boot">
          <h1>Product not found</h1>
          <p>{loadError || "This item isn't available right now."}</p>
          <button className="ws-btn-gold" onClick={() => navigate('/shop')}>Back to Shop</button>
        </div>
      </div>
    );
  }

  const variantGated = Boolean(product.has_variants) && Boolean(settings && settings.enable_variants);
  // show_stem_length only picks the picker's label/wording — the picker itself
  // renders for any variant-gated item so add-to-cart never silently no-ops.
  const showStemLength = variantGated && Boolean(settings.show_stem_length);
  const showBoxType = Boolean(settings && settings.show_box_type);
  const stockQty = productInfo && productInfo.stock_qty;
  const maxQty = typeof stockQty === 'number' && stockQty > 0 ? Math.floor(stockQty) : undefined;

  const stockGated = Boolean(settings && settings.show_stock_availability);
  const outOfStock = stockGated && productInfo && productInfo.in_stock === false && !productInfo.on_backorder;

  const canAdd =
    !adding &&
    (!variantGated || Boolean(resolvedItemCode)) &&
    !outOfStock &&
    qty > 0;

  async function handleAddToCart() {
    if (!resolvedItemCode || !canAdd) return;
    setAdding(true);
    setAddResult(null);
    const entry = {
      item_code: resolvedItemCode,
      qty,
      custom_box_type: showBoxType && selectedBoxType ? selectedBoxType : undefined,
    };
    try {
      if (!window.logged_in) {
        // update_cart requires login (confirmed live: 403 "not whitelisted"
        // for Guest). Stash the entry server-side and send the guest to log
        // in; pending_cart.replay_for_user() replays it into their cart on
        // session creation, then redirects to /cart.
        await stashPendingCart([entry]);
        const redirect = (await getGuestRedirectOnAction().catch(() => '')) || '/login';
        const returnTo = window.location.pathname + window.location.search;
        window.location.href = `${redirect}${redirect.includes('?') ? '&' : '?'}redirect-to=${encodeURIComponent(returnTo)}`;
        return;
      }
      const res = await updateCart(entry);
      setCartCount(res && res.cart_count);
      setAddResult({ ok: true, message: 'Added to cart.' });
    } catch (e) {
      setAddResult({ ok: false, message: String(e) });
    } finally {
      setAdding(false);
    }
  }

  return (
    <div className="ws-shop ws-product">
      <div className="ws-pd-layout">
        <Gallery image={product.website_image} alt={product.web_item_name} />

        <div className="ws-pd-info">
          <div className="ws-pd-group">{product.item_group}</div>
          <div className="ws-pd-title-row">
            <h1 className="ws-pd-title">{product.web_item_name}</h1>
            {settings && settings.enable_wishlist && (
              <WishlistButton itemCode={product.item_code} wished={product.wished} size="lg" />
            )}
          </div>

          <PriceBlock
            settings={settings}
            productInfo={productInfo}
            loading={infoLoading}
            awaitingVariant={variantGated && !resolvedItemCode}
          />

          {(product.web_long_description || product.short_description) && (
            <div
              className="ws-pd-description"
              dangerouslySetInnerHTML={{
                __html: product.web_long_description || product.short_description,
              }}
            />
          )}

          {variantGated && (
            <div className="ws-pd-section">
              <span className="ws-rail-title">{showStemLength ? 'Stem length' : 'Options'}</span>
              <StemLengthSelector
                templateItemCode={product.item_code}
                onResolvedChange={setResolvedItemCode}
              />
            </div>
          )}

          {showBoxType && boxItems.length > 0 && (
            <div className="ws-pd-section">
              <label className="ws-rail-field">
                <span className="ws-rail-title">Box type</span>
                <select
                  className="ws-search"
                  value={selectedBoxType}
                  onChange={(e) => setSelectedBoxType(e.target.value)}
                >
                  <option value="">No box selected</option>
                  {boxItems.map((b) => (
                    <option key={b.name} value={b.name}>{b.item_name || b.name}</option>
                  ))}
                </select>
              </label>
            </div>
          )}

          <div className="ws-pd-section ws-pd-add-row">
            <QtyStepper value={qty} onChange={setQty} max={maxQty} disabled={adding || outOfStock} />
            <button
              className="ws-btn-gold"
              disabled={!canAdd}
              onClick={handleAddToCart}
            >
              {outOfStock ? 'Sold out' : adding ? 'Adding…' : 'Add to Cart'}
            </button>
          </div>

          {outOfStock && (
            <div className="ws-pd-hint ws-pd-hint-bad">This item is currently out of stock.</div>
          )}

          {!outOfStock && variantGated && !resolvedItemCode && (
            <div className="ws-pd-hint">
              {showStemLength
                ? 'Choose a stem length to add this item to your cart.'
                : 'Choose an option to add this item to your cart.'}
            </div>
          )}

          {addResult && (
            <div className={`ws-pd-add-result ws-pd-add-result-${addResult.ok ? 'ok' : 'err'}`} role="status">
              {addResult.message}
              {addResult.ok && (
                <button className="ws-rail-clear" onClick={() => navigate('/cart')}>View cart</button>
              )}
            </div>
          )}
        </div>
      </div>

      {settings && settings.enable_reviews && <Reviews webItem={product.name} />}
    </div>
  );
}
