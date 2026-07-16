import { useEffect, useMemo, useState } from 'react';
import { useRoute } from '../router';
import { useStore } from '../store';
import {
  updateCart,
  applyCouponCode,
  removeCouponCode,
  searchDeliveryPoints,
  updateCartDeliveryPoint,
  searchConsignees,
  updateCartConsignee,
  updateCartLineCode,
  updateCartBoxType,
  searchBoxTypes,
  placeOrder,
  requestForQuotation,
  submitCartOrder,
  getGuestRedirectOnAction,
} from '../lib/api';
import QtyStepper from '../components/QtyStepper';
import { formatMoney } from '../lib/format';

const SEARCH_DEBOUNCE_MS = 300;

// Debounced Link-style search box used for both Delivery Point and Consignee —
// both endpoints are guest-safe Link searches (search_delivery_points /
// search_consignees, both `@frappe.whitelist()` ignoring permissions
// server-side) returning [{value, label, description}].
function LinkSearchField({ label, value, placeholder, search, onSelect, disabled }) {
  const [draft, setDraft] = useState('');
  const [options, setOptions] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    const t = setTimeout(() => {
      search(draft, 20)
        .then((rows) => { if (!cancelled) setOptions(rows || []); })
        .catch(() => { if (!cancelled) setOptions([]); })
        .finally(() => { if (!cancelled) setLoading(false); });
    }, SEARCH_DEBOUNCE_MS);
    return () => { cancelled = true; clearTimeout(t); };
  }, [draft, open]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <label className="ws-rail-field ws-cart-search-field">
      <span className="ws-rail-title">{label}</span>
      <input
        type="text"
        className="ws-search"
        value={open ? draft : (value || '')}
        placeholder={placeholder}
        disabled={disabled}
        onFocus={() => { setDraft(''); setOpen(true); }}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onChange={(e) => setDraft(e.target.value)}
      />
      {open && (
        <div className="ws-cart-search-menu">
          {loading && <div className="ws-cart-search-hint">Searching…</div>}
          {!loading && options.length === 0 && <div className="ws-cart-search-hint">No matches.</div>}
          {!loading && options.map((o) => (
            <button
              type="button"
              key={o.value}
              className="ws-cart-search-item"
              onMouseDown={(e) => { e.preventDefault(); onSelect(o.value); setOpen(false); }}
            >
              {o.label || o.value}
            </button>
          ))}
        </div>
      )}
    </label>
  );
}

// Cart + checkout. Consumes upande_webshop's own cart.* whitelisted methods
// only (get_cart_quotation, update_cart, apply/remove_coupon_code,
// search/update_cart_delivery_point, update_cart_box_type,
// place_order/request_for_quotation/submit_cart_order) — no new backend.
export default function Cart() {
  const { navigate } = useRoute();
  const settings = useStore((s) => s.settings);
  const cart = useStore((s) => s.cart);
  const cartLoading = useStore((s) => s.cartLoading);
  const cartError = useStore((s) => s.cartError);
  const loadCart = useStore((s) => s.loadCart);
  const setCartCount = useStore((s) => s.setCartCount);
  const setLastOrder = useStore((s) => s.setLastOrder);

  const [boxTypeOptions, setBoxTypeOptions] = useState([]);
  const [mutatingRow, setMutatingRow] = useState(null); // child docname in flight (per-row spinner only)
  const [rowError, setRowError] = useState(null);

  // Cart-wide "busy" flag: every mutation below shares this same flag (not a
  // per-control one) because all cart mutations save the SAME parent
  // Quotation/Sales Order — concurrent saves race on Frappe's optimistic lock
  // (TimestampMismatchError). Disabling every mutation control while ANY one
  // is in flight is the simplest correct guard against that race.
  const [cartBusy, setCartBusy] = useState(false);

  const [couponDraft, setCouponDraft] = useState('');
  const [referralDraft, setReferralDraft] = useState('');
  const [couponError, setCouponError] = useState(null);

  const [lineCodeDraft, setLineCodeDraft] = useState('');

  const [checkoutBusy, setCheckoutBusy] = useState(false);
  const [checkoutError, setCheckoutError] = useState(null);
  const [checkoutStep, setCheckoutStep] = useState(null); // 'saved' once step-1 of the two-step flow is done

  const loggedIn = Boolean(window.logged_in);

  useEffect(() => {
    if (!loggedIn) return;
    loadCart();
  }, [loggedIn]); // eslint-disable-line react-hooks/exhaustive-deps

  const cartSettings = (cart && cart.cart_settings) || settings;
  const doc = cart && cart.doc;

  // Cart-level Box Type options must come from the Box Type doctype itself
  // (search_box_types), not getBoxItems' Item codes — update_cart_box_type
  // validates against `Box Type`, a different doctype, and throws otherwise.
  // Empty txt pulls the full (capped) list for a plain <select>.
  useEffect(() => {
    if (!cartSettings || !cartSettings.show_box_type) return;
    let cancelled = false;
    searchBoxTypes('', 100)
      .then((rows) => { if (!cancelled) setBoxTypeOptions(rows || []); })
      .catch(() => { if (!cancelled) setBoxTypeOptions([]); });
    return () => { cancelled = true; };
  }, [cartSettings && cartSettings.show_box_type]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setLineCodeDraft((doc && doc.custom_line_code) || '');
  }, [doc && doc.custom_line_code]); // eslint-disable-line react-hooks/exhaustive-deps

  const items = (doc && doc.items) || [];
  const totalStems = useMemo(
    () => items.reduce((sum, d) => sum + (Number(d.qty) || 0) * (Number(d.conversion_factor) || 1), 0),
    [items]
  );

  // Refresh from get_cart_quotation unconditionally after any mutation
  // (success or failure) so the client can never diverge from server state —
  // e.g. removing the last row deletes the parent doc server-side; without
  // this the removed row would otherwise stay visible in a stale UI.
  async function refreshCart() {
    const data = await loadCart();
    return data;
  }

  async function handleQtyChange(row, qty) {
    setMutatingRow(row.name);
    setCartBusy(true);
    setRowError(null);
    try {
      const res = await updateCart({
        item_code: row.item_code,
        qty,
        uom: row.uom,
        custom_length: row.custom_length,
        custom_box_type: row.custom_box_type,
        child_docname: row.name,
        // Removing a row (qty 0) must rebuild the response via
        // get_cart_quotation(doc=None) instead of dereferencing the plain
        // {name: quotation.name, ...} shape — when this is the LAST row,
        // update_cart deletes the parent Quotation/Sales Order and
        // `quotation` becomes None, so the non-with_items branch would throw
        // an AttributeError (500). The with_items branch guards against a
        // None quotation itself (confirmed by reading cart.py).
        with_items: qty === 0,
      });
      if (res && res.cart_count != null) setCartCount(res.cart_count);
    } catch (e) {
      setRowError(String(e));
    } finally {
      await refreshCart();
      setMutatingRow(null);
      setCartBusy(false);
    }
  }

  async function handleRemove(row) {
    await handleQtyChange(row, 0);
  }

  async function handleApplyCoupon() {
    if (!couponDraft.trim()) return;
    setCartBusy(true);
    setCouponError(null);
    try {
      await applyCouponCode(couponDraft.trim(), referralDraft.trim() || undefined);
      setCouponDraft('');
      setReferralDraft('');
    } catch (e) {
      setCouponError(String(e));
    } finally {
      await refreshCart();
      setCartBusy(false);
    }
  }

  async function handleRemoveCoupon() {
    setCartBusy(true);
    setCouponError(null);
    try {
      await removeCouponCode();
    } catch (e) {
      setCouponError(String(e));
    } finally {
      await refreshCart();
      setCartBusy(false);
    }
  }

  async function handleDeliveryPoint(value) {
    setCartBusy(true);
    try {
      await updateCartDeliveryPoint(value);
    } catch (e) {
      setRowError(String(e));
    } finally {
      await refreshCart();
      setCartBusy(false);
    }
  }

  async function handleConsignee(value) {
    setCartBusy(true);
    try {
      await updateCartConsignee(value);
    } catch (e) {
      setRowError(String(e));
    } finally {
      await refreshCart();
      setCartBusy(false);
    }
  }

  async function handleLineCodeSave() {
    setCartBusy(true);
    try {
      await updateCartLineCode(lineCodeDraft);
    } catch (e) {
      setRowError(String(e));
    } finally {
      await refreshCart();
      setCartBusy(false);
    }
  }

  async function handleBoxType(value) {
    setCartBusy(true);
    try {
      await updateCartBoxType(value);
    } catch (e) {
      setRowError(String(e));
    } finally {
      await refreshCart();
      setCartBusy(false);
    }
  }

  // Checkout method selection mirrors upande_webshop's own cart.js /
  // place_order.html: `enable_checkout` → a single place_order() call (gateway
  // flow). Otherwise → request_for_quotation(); when the cart doctype is
  // Sales Order (`use_sales_order_as_cart`), that call only ever leaves a
  // DRAFT Sales Order (confirmed by reading request_for_quotation() — it
  // submits only for a Quotation doctype), so a second submit_cart_order()
  // call is required — the two-step "Save Order" → "Submit Order" flow.
  async function handleCheckout() {
    setCheckoutBusy(true);
    setCartBusy(true);
    setCheckoutError(null);
    try {
      // Snapshot the about-to-be-submitted cart (items/totals/currency) so
      // Order.jsx can render a confirmation without needing to re-fetch the
      // placed order — there is no whitelisted method that does that (see
      // lib/api.js getOrderDoc's comment). Captures the same `doc`/`currency`
      // this render already computed from the last get_cart_quotation() load.
      const snapshot = (name) => setLastOrder({ name, doc, currency, showPrice: Boolean(cartSettings && cartSettings.show_price) });

      if (cartSettings && cartSettings.enable_checkout) {
        const res = await placeOrder();
        if (res && typeof res === 'object' && res.error) { setCheckoutError(res.error); return; }
        snapshot(res);
        navigate(`/orders/${res}`);
        return;
      }
      if (checkoutStep === 'saved') {
        const res = await submitCartOrder();
        if (res && typeof res === 'object' && res.error) { setCheckoutError(res.error); return; }
        snapshot(res);
        navigate(`/orders/${res}`);
        return;
      }
      const res = await requestForQuotation();
      if (res && typeof res === 'object' && res.error) { setCheckoutError(res.error); return; }
      if (cartSettings && cartSettings.use_sales_order_as_cart) {
        setCheckoutStep('saved');
        return;
      }
      snapshot(res);
      navigate(`/orders/${res}`);
    } catch (e) {
      setCheckoutError(String(e));
    } finally {
      setCheckoutBusy(false);
      setCartBusy(false);
    }
  }

  if (!loggedIn) {
    return (
      <div className="ws-shop ws-cart-page">
        <div className="ws-empty ws-cart-guest">
          <h1 className="ws-pd-title">Sign in to view your cart</h1>
          <p>Your cart is saved to your account. Sign in to see items, quantities, and check out.</p>
          <button
            className="ws-btn-gold"
            onClick={async () => {
              const redirect = (await getGuestRedirectOnAction().catch(() => '')) || '/login';
              const returnTo = '/upande-webstore/cart';
              window.location.href = `${redirect}${redirect.includes('?') ? '&' : '?'}redirect-to=${encodeURIComponent(returnTo)}`;
            }}
          >
            Sign in
          </button>
        </div>
      </div>
    );
  }

  if (cartLoading && !cart) {
    return <div className="ws-shop"><div className="boot">Loading your cart…</div></div>;
  }

  if (cartError && !cart) {
    return (
      <div className="ws-shop">
        <div className="boot">
          <h1>Could not load your cart</h1>
          <p>{cartError}</p>
          <button className="ws-btn-gold" onClick={() => loadCart()}>Retry</button>
        </div>
      </div>
    );
  }

  // A refreshed cart is never a bare null — get_cart_quotation() always
  // creates a fresh (possibly empty) Quotation/Sales Order when none exists —
  // but render the same empty-cart state defensively if it ever comes back
  // without a doc, so the UI can't get stuck on a blank page.
  if (!doc || items.length === 0) {
    return (
      <div className="ws-shop ws-cart-page">
        <div className="ws-empty ws-cart-empty">
          <h1 className="ws-pd-title">Your cart is empty</h1>
          <p>Browse the shop and add a few stems to get started.</p>
          <button className="ws-btn-gold" onClick={() => navigate('/shop')}>Shop now</button>
        </div>
      </div>
    );
  }

  const showPrice = Boolean(cartSettings && cartSettings.show_price);
  const currency = doc.currency;
  const showCoupon = Boolean(cartSettings && cartSettings.show_apply_coupon_code_in_website);
  const showBoxType = Boolean(cartSettings && cartSettings.show_box_type);
  const showLineCode = Boolean(cartSettings && cartSettings.show_cart_line_code) && doc.custom_line_code !== undefined;
  const showDeliveryPoint = doc.custom_delivery_point !== undefined;
  const showConsignee = doc.custom_consignee !== undefined;
  const deliveryDate = doc.delivery_date || doc.custom_delivery_date;

  const checkoutLabel = cartSettings && cartSettings.enable_checkout
    ? 'Place Order'
    : checkoutStep === 'saved'
      ? 'Submit Order'
      : cartSettings && cartSettings.use_sales_order_as_cart
        ? 'Save Order'
        : 'Request Quote';

  return (
    <div className="ws-shop ws-cart-page">
      <div className="ws-section-hd">
        <h1>Your Cart</h1>
        <span className="ws-section-count">{items.length} line{items.length === 1 ? '' : 's'} · {totalStems} stem{totalStems === 1 ? '' : 's'}</span>
      </div>

      <div className="ws-cart-layout">
        <div className="ws-cart-items">
          {rowError && <div className="ws-pd-add-result ws-pd-add-result-err" role="alert">{rowError}</div>}
          {items.map((d) => {
            const maxBunches = d._max_stock_bunches || 0;
            const rowMutating = mutatingRow === d.name;
            return (
              <div className={`ws-cart-row${rowMutating ? ' ws-cart-row-mutating' : ''}`} key={d.name}>
                <div className="ws-cart-row-img">
                  {d.thumbnail || d.website_image ? (
                    <img src={d.thumbnail || d.website_image} alt={d.web_item_name || d.item_name} />
                  ) : (
                    <span className="material-symbols-outlined ws-card-ph">local_florist</span>
                  )}
                </div>
                <div className="ws-cart-row-info">
                  <div className="ws-cart-row-title">
                    {d.web_item_name || d.item_name}
                    {d.custom_length ? `-${d.custom_length}` : ''}
                  </div>
                  <div className="ws-cart-row-meta">
                    {d.uom && <span>Pack: {d.uom}</span>}
                    {d.custom_box_type && <span>Box: {d.custom_box_type}</span>}
                  </div>
                  {showPrice && (
                    <div className="ws-cart-row-rate">{formatMoney(d.rate, currency)} / stem</div>
                  )}
                </div>
                <div className="ws-cart-row-qty">
                  <QtyStepper
                    value={Number(d.qty) || 1}
                    onChange={(v) => handleQtyChange(d, v)}
                    min={1}
                    max={maxBunches > 0 ? maxBunches : undefined}
                    disabled={cartBusy}
                  />
                  <button className="ws-rail-clear ws-cart-remove" disabled={cartBusy} onClick={() => handleRemove(d)}>
                    Remove
                  </button>
                </div>
                {showPrice && (
                  <div className="ws-cart-row-amount">{formatMoney(d.amount, currency)}</div>
                )}
              </div>
            );
          })}
        </div>

        <aside className="ws-cart-summary">
          {showCoupon && (
            <div className="ws-rail-block ws-cart-card">
              <span className="ws-rail-title">Coupon code</span>
              {doc.coupon_code ? (
                <div className="ws-cart-coupon-applied">
                  <span>{doc.coupon_code}</span>
                  <button className="ws-rail-clear" disabled={cartBusy} onClick={handleRemoveCoupon}>Remove</button>
                </div>
              ) : (
                <>
                  <input
                    type="text"
                    className="ws-search"
                    placeholder="Coupon code"
                    value={couponDraft}
                    disabled={cartBusy}
                    onChange={(e) => setCouponDraft(e.target.value)}
                  />
                  <input
                    type="text"
                    className="ws-search"
                    placeholder="Referral code (optional)"
                    value={referralDraft}
                    disabled={cartBusy}
                    onChange={(e) => setReferralDraft(e.target.value)}
                  />
                  <button className="ws-page-btn" disabled={cartBusy || !couponDraft.trim()} onClick={handleApplyCoupon}>
                    {cartBusy ? 'Please wait…' : 'Apply'}
                  </button>
                </>
              )}
              {couponError && <div className="ws-pd-hint ws-pd-hint-bad">{couponError}</div>}
            </div>
          )}

          {showDeliveryPoint && (
            <div className="ws-rail-block ws-cart-card">
              <LinkSearchField
                label="Delivery point"
                value={doc.custom_delivery_point}
                placeholder="Search delivery points…"
                search={searchDeliveryPoints}
                onSelect={handleDeliveryPoint}
                disabled={cartBusy}
              />
            </div>
          )}

          {showConsignee && (
            <div className="ws-rail-block ws-cart-card">
              <LinkSearchField
                label="Consignee"
                value={doc.custom_consignee}
                placeholder="Search consignees…"
                search={searchConsignees}
                onSelect={handleConsignee}
                disabled={cartBusy}
              />
            </div>
          )}

          {showLineCode && (
            <div className="ws-rail-block ws-cart-card">
              <label className="ws-rail-field">
                <span className="ws-rail-title">Line code</span>
                <input
                  type="text"
                  className="ws-search"
                  value={lineCodeDraft}
                  onChange={(e) => setLineCodeDraft(e.target.value.toUpperCase())}
                  onBlur={() => { if (lineCodeDraft !== (doc.custom_line_code || '')) handleLineCodeSave(); }}
                  disabled={cartBusy}
                />
              </label>
            </div>
          )}

          {showBoxType && (
            <div className="ws-rail-block ws-cart-card">
              <label className="ws-rail-field">
                <span className="ws-rail-title">Box type</span>
                <select
                  className="ws-search"
                  value={doc.custom_box_type || ''}
                  disabled={cartBusy}
                  onChange={(e) => handleBoxType(e.target.value)}
                >
                  <option value="">No box selected</option>
                  {boxTypeOptions.map((b) => (
                    <option key={b.value} value={b.value}>{b.label || b.value}</option>
                  ))}
                </select>
              </label>
            </div>
          )}

          {deliveryDate && (
            <div className="ws-cart-card ws-cart-delivery-date">
              <span className="ws-rail-title">Delivery date</span>
              <span>{deliveryDate}</span>
            </div>
          )}

          <div className="ws-cart-card ws-cart-totals">
            {showPrice ? (
              <>
                <div className="ws-cart-total-row">
                  <span>Net total</span>
                  <span>{formatMoney(doc.net_total ?? doc.total, currency)}</span>
                </div>
                <div className="ws-cart-total-row ws-cart-total-grand">
                  <span>Grand total</span>
                  <span>{formatMoney(doc.grand_total, currency)}</span>
                </div>
              </>
            ) : (
              <div className="ws-cart-total-row">
                <span>Total quantity</span>
                <span>{doc.total_qty}</span>
              </div>
            )}
          </div>

          {checkoutError && <div className="ws-pd-add-result ws-pd-add-result-err" role="alert">{checkoutError}</div>}

          <button className="ws-btn-gold ws-cart-checkout" disabled={cartBusy} onClick={handleCheckout}>
            {checkoutBusy ? 'Please wait…' : checkoutLabel}
          </button>
        </aside>
      </div>
    </div>
  );
}
