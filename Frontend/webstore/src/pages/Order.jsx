import { useEffect, useState } from 'react';
import { useRoute } from '../router';
import { useStore } from '../store';
import { getOrderDoc, getGuestRedirectOnAction } from '../lib/api';

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
// built-in) uses. So this page, in order of preference:
//   1. Uses the in-memory snapshot Cart.jsx captured right before checkout
//      (store.lastOrder) — always available on the actual post-checkout
//      redirect, the primary flow, and needs no extra request.
//   2. Falls back to `frappe.client.get("Sales Order"|"Quotation", name)` —
//      works only if this user's role/User-Permission setup also grants
//      ordinary desk read access to their own order (not guaranteed).
//   3. Falls back to a minimal confirmation (order number + links to the
//      site's own /orders and /quotations pages, which DO carry the correct
//      has_website_permission-gated view) if neither has the data.
// Viewing an order requires login the same way mutating the cart does (a
// guest can't own an order), so guests get the same sign-in gate Cart.jsx/
// Wishlist.jsx use.
export default function Order() {
  const { params, navigate } = useRoute();
  const name = params.name;
  const lastOrder = useStore((s) => s.lastOrder);

  const loggedIn = Boolean(window.logged_in);

  const [fetched, setFetched] = useState(undefined); // undefined = not tried, null = not found, {doctype, doc} = found
  const [fetchTried, setFetchTried] = useState(false);

  const snapshotMatches = Boolean(lastOrder && lastOrder.name === name);

  useEffect(() => {
    setFetched(undefined);
    setFetchTried(false);
    if (!loggedIn || !name || snapshotMatches) return;
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
  }, [loggedIn, name, snapshotMatches]);

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

  // 1) In-memory snapshot from the checkout that just happened.
  if (snapshotMatches) {
    const { doc, currency, showPrice } = lastOrder;
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

  // Waiting on the frappe.client.get fallback attempt.
  if (!fetchTried) {
    return <div className="ws-shop"><div className="boot">Loading your order…</div></div>;
  }

  // 2) frappe.client.get succeeded.
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
              <div className="ws-cart-row-amount">{formatMoney(d.amount, currency)}</div>
            </div>
          ))}
        </div>

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

        <button className="ws-btn-gold" onClick={() => navigate('/shop')}>Continue shopping</button>
      </div>
    );
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
