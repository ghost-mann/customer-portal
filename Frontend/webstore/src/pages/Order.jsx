import { useEffect, useState } from 'react';
import { useRoute } from '../router';
import { useStore } from '../store';
import { getOrderDoc, getGuestRedirectOnAction } from '../lib/api';

// TODO(RT7): formatMoney is duplicated between Cart.jsx and Order.jsx —
// extract to lib/format.js.
function formatMoney(amount, currency) {
  const n = Number(amount) || 0;
  if (!currency) return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(n);
  } catch (e) {
    return `${currency} ${n.toFixed(2)}`;
  }
}

// `/upande-webstore/orders/<name>` — the post-checkout confirmation.
//
// There is no whitelisted JSON method anywhere in upande_webshop that
// re-fetches a placed order's contents; the only order VIEW is the
// server-rendered Jinja page (templates/pages/order.py), reached at the
// site's own `/orders/<name>` (Sales Order) / `/quotations/<name>`
// (Quotation) via erpnext's website_route_rules, gated by
// `frappe.has_website_permission()` — a portal-specific check distinct from
// the desk role/User-Permission check `frappe.client.get` (frappe's own
// built-in) uses. So this page, for a logged-in user, always attempts
// `frappe.client.get("Sales Order"|"Quotation", name)` and treats it as
// AUTHORITATIVE once it resolves — place_order()/submit_cart_order() build a
// brand-new Sales Order (re-evaluated totals/box calc) distinct from the
// Quotation Cart.jsx snapshotted right before checkout, so the snapshot can
// be numerically stale even when its name matches. In order of preference:
//   1. `frappe.client.get` result, once the fetch resolves successfully —
//      the real, current order doc.
//   2. The in-memory snapshot Cart.jsx captured right before checkout
//      (store.lastOrder) — used only (a) as an instant first paint while
//      the fetch above is still in flight, and (b) as a fallback if that
//      fetch fails (e.g. this user's role/User-Permission setup doesn't
//      grant ordinary desk read access to their own order — not
//      guaranteed).
//   3. A minimal confirmation (order number + links to the site's own
//      /orders and /quotations pages, which DO carry the correct
//      has_website_permission-gated view) if neither has the data.
// Viewing an order requires login the same way mutating the cart does (a
// guest can't own an order), so guests get the same sign-in gate Cart.jsx/
// Wishlist.jsx use, and never trigger the frappe.client.get fetch above.
export default function Order() {
  const { params, navigate } = useRoute();
  const name = params.name;
  const lastOrder = useStore((s) => s.lastOrder);
  // Global Webshop Settings (embedded on every get_product_filter_data
  // response, bootstrapped app-wide in App.jsx) — the same show_price flag
  // Cart.jsx gates on, used here to gate the tier-2 (frappe.client.get)
  // branch below. Tier-1 (snapshot) gates on its own `showPrice` captured
  // at checkout time instead — see that branch.
  const settings = useStore((s) => s.settings);
  const showPrice = Boolean(settings && settings.show_price);

  const loggedIn = Boolean(window.logged_in);

  const [fetched, setFetched] = useState(undefined); // undefined = not tried, null = not found, {doctype, doc} = found
  const [fetchTried, setFetchTried] = useState(false);

  const snapshotMatches = Boolean(lastOrder && lastOrder.name === name);

  useEffect(() => {
    setFetched(undefined);
    setFetchTried(false);
    // Always attempt the real fetch for a logged-in user, even when the
    // checkout-time snapshot already matches this order name — the fetched
    // doc is authoritative (see file header) and must win once it resolves.
    // The snapshot is only used as first paint / fallback below, never to
    // skip this fetch.
    if (!loggedIn || !name) return;
    let cancelled = false;
    (async () => {
      for (const doctype of ['Sales Order', 'Quotation']) {
        try {
          const doc = await getOrderDoc(doctype, name);
          if (cancelled) return;
          if (doc) { setFetched({ doctype, doc }); setFetchTried(true); return; }
        } catch (e) {
          // Permission denied or doesn't exist under this doctype — try the
          // next one, then fall through to the minimal confirmation.
        }
      }
      if (!cancelled) { setFetched(null); setFetchTried(true); }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loggedIn, name]);

  if (!loggedIn) {
    return (
      <div className="ws-shop ws-cart-page">
        <div className="ws-empty ws-cart-guest">
          <h1 className="ws-pd-title">Sign in to view this order</h1>
          <p>Order confirmations are tied to your account. Sign in to see the details.</p>
          <button
            className="ws-btn-gold"
            onClick={async () => {
              const redirect = (await getGuestRedirectOnAction().catch(() => '')) || '/login';
              const returnTo = window.location.pathname;
              window.location.href = `${redirect}${redirect.includes('?') ? '&' : '?'}redirect-to=${encodeURIComponent(returnTo)}`;
            }}
          >
            Sign in
          </button>
        </div>
      </div>
    );
  }

  if (!name) {
    return (
      <div className="ws-shop">
        <div className="boot">
          <h1>Order not found</h1>
          <button className="ws-btn-gold" onClick={() => navigate('/shop')}>Back to Shop</button>
        </div>
      </div>
    );
  }

  // 1) frappe.client.get succeeded — this is the real, current order doc
  // (place_order()/submit_cart_order() re-evaluate totals/box calc into a
  // brand-new Sales Order distinct from the Quotation Cart.jsx snapshotted),
  // so it wins over the checkout-time snapshot whenever it's available,
  // even if a snapshot for the same order name also exists.
  if (fetched) {
    const { doctype, doc } = fetched;
    const items = doc.items || [];
    const currency = doc.currency;
    return (
      <div className="ws-shop ws-cart-page ws-order-page">
        <div className="ws-order-confirm-banner">
          <span aria-hidden="true" className="material-symbols-outlined">task_alt</span>
          <div>
            <h1 className="ws-pd-title">Order {doc.name}</h1>
            <p>{doctype} · {doc.status || (doc.docstatus === 1 ? 'Submitted' : 'Draft')}</p>
          </div>
        </div>

        <div className="ws-order-items">
          {items.map((d, i) => (
            <div className="ws-cart-row ws-order-row-compact" key={d.name || i}>
              <div className="ws-cart-row-info">
                <div className="ws-cart-row-title">{d.item_name}</div>
                <div className="ws-cart-row-meta"><span>Qty: {d.qty}</span></div>
              </div>
              {showPrice && <div className="ws-cart-row-amount">{formatMoney(d.amount, currency)}</div>}
            </div>
          ))}
        </div>

        {showPrice && (
          <div className="ws-cart-card ws-cart-totals ws-order-totals">
            <div className="ws-cart-total-row">
              <span>Net total</span>
              <span>{formatMoney(doc.net_total ?? doc.total, currency)}</span>
            </div>
            <div className="ws-cart-total-row ws-cart-total-grand">
              <span>Grand total</span>
              <span>{formatMoney(doc.grand_total, currency)}</span>
            </div>
          </div>
        )}

        <button className="ws-btn-gold" onClick={() => navigate('/shop')}>Continue shopping</button>
      </div>
    );
  }

  // 2) In-memory checkout snapshot — used only (a) for an instant first
  // paint while the frappe.client.get fetch above is still in flight
  // (fetchTried === false), or (b) as a fallback once that fetch has come
  // back empty/forbidden (fetched === null). Never shown once `fetched`
  // above is populated, so a stale snapshot can't outrank the real doc.
  if (snapshotMatches) {
    const { doc, currency, showPrice: snapshotShowPrice } = lastOrder;
    const items = (doc && doc.items) || [];
    return (
      <div className="ws-shop ws-cart-page ws-order-page">
        <div className="ws-order-confirm-banner">
          <span aria-hidden="true" className="material-symbols-outlined">task_alt</span>
          <div>
            <h1 className="ws-pd-title">Thank you — your order is confirmed</h1>
            <p>Order number <strong>{name}</strong></p>
          </div>
        </div>

        <div className="ws-order-items">
          {items.map((d) => (
            <div className="ws-cart-row" key={d.name}>
              <div className="ws-cart-row-img">
                {d.thumbnail || d.website_image
                  ? <img src={d.thumbnail || d.website_image} alt={d.web_item_name || d.item_name} />
                  : <span aria-hidden="true" className="material-symbols-outlined ws-card-ph">local_florist</span>}
              </div>
              <div className="ws-cart-row-info">
                <div className="ws-cart-row-title">
                  {d.web_item_name || d.item_name}
                  {d.custom_length ? `-${d.custom_length}` : ''}
                </div>
                <div className="ws-cart-row-meta">
                  <span>Qty: {d.qty}</span>
                  {d.uom && <span>Pack: {d.uom}</span>}
                </div>
              </div>
              {snapshotShowPrice && <div className="ws-cart-row-amount">{formatMoney(d.amount, currency)}</div>}
            </div>
          ))}
        </div>

        {snapshotShowPrice && (
          <div className="ws-cart-card ws-cart-totals ws-order-totals">
            <div className="ws-cart-total-row">
              <span>Net total</span>
              <span>{formatMoney(doc.net_total ?? doc.total, currency)}</span>
            </div>
            <div className="ws-cart-total-row ws-cart-total-grand">
              <span>Grand total</span>
              <span>{formatMoney(doc.grand_total, currency)}</span>
            </div>
          </div>
        )}

        <button className="ws-btn-gold" onClick={() => navigate('/shop')}>Continue shopping</button>
      </div>
    );
  }

  // Waiting on the frappe.client.get fetch and no snapshot to show meanwhile.
  if (!fetchTried) {
    return <div className="ws-shop"><div className="boot">Loading your order…</div></div>;
  }

  // 3) Minimal fallback — no in-memory snapshot (direct link / reload) and no
  // permission to re-fetch the order over the API. Point to the site's own
  // has_website_permission-gated order pages instead.
  return (
    <div className="ws-shop ws-cart-page ws-order-page">
      <div className="ws-order-confirm-banner">
        <span aria-hidden="true" className="material-symbols-outlined">task_alt</span>
        <div>
          <h1 className="ws-pd-title">Your order has been placed</h1>
          <p>Order number <strong>{name}</strong></p>
        </div>
      </div>
      <div className="ws-empty">
        <p>We can't display the full order details here right now. View it in your account instead:</p>
        <div className="ws-order-fallback-links">
          <a className="ws-page-btn" href={`/orders/${encodeURIComponent(name)}`}>View as Sales Order</a>
          <a className="ws-page-btn" href={`/quotations/${encodeURIComponent(name)}`}>View as Quotation</a>
          <a className="ws-page-btn" href="/customer-portal">Customer Portal</a>
        </div>
      </div>
      <button className="ws-btn-gold" onClick={() => navigate('/shop')}>Continue shopping</button>
    </div>
  );
}
