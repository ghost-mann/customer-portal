import { useEffect, useState } from 'react';
import { useRoute } from '../router';
import { useStore } from '../store';
import { listOrders, getGuestRedirectOnAction } from '../lib/api';
import { formatMoney } from '../lib/format';
import { isLoggedIn } from '../lib/auth';

function statusTone(status) {
  const s = (status || '').toLowerCase();
  if (s.includes('cancel')) return 'bad';
  if (s === 'completed' || s === 'closed') return 'good';
  return 'muted';
}

// `/upande-webstore/orders` — in-SPA order history, replacing the old bounce
// out to erpnext's own server-rendered `/orders` page. Sources rows from
// customer_portal's own list_orders (login-gated, `@frappe.whitelist()`,
// no allow_guest — see lib/api.js's listOrders comment); this is the SAME
// method the customer-panel app's Orders page already consumes, reused here
// rather than adding any new backend. Each row links into this SPA's own
// order-detail route (`/orders/<name>` -> router.js's `confirmation` page,
// pages/Order.jsx) instead of back out to erpnext.
export default function Orders() {
  const { navigate } = useRoute();
  const settings = useStore((s) => s.settings);
  // This page is login-gated below before ever calling listOrders, so the
  // guest-hidden branch of the show_price convention (PriceBlock.jsx,
  // Order.jsx) can never apply here — gating on settings.show_price alone
  // mirrors what those pages do for a logged-in viewer.
  const showPrice = Boolean(settings && settings.show_price);

  const loggedIn = isLoggedIn();
  const [orders, setOrders] = useState(undefined); // undefined = loading, null = error
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!loggedIn) return;
    let cancelled = false;
    setOrders(undefined);
    setError(null);
    listOrders()
      .then((rows) => { if (!cancelled) setOrders(rows || []); })
      .catch((e) => { if (!cancelled) { setOrders(null); setError(String(e)); } });
    return () => { cancelled = true; };
  }, [loggedIn]);

  if (!loggedIn) {
    return (
      <div className="ws-shop ws-cart-page">
        <div className="ws-empty ws-cart-guest">
          <h1 className="ws-pd-title">Sign in to view your orders</h1>
          <p>Your order history is tied to your account. Sign in to see past orders and their status.</p>
          <button
            className="ws-btn-gold"
            onClick={async () => {
              const redirect = (await getGuestRedirectOnAction().catch(() => '')) || '/login';
              const returnTo = '/upande-webstore/orders';
              window.location.href = `${redirect}${redirect.includes('?') ? '&' : '?'}redirect-to=${encodeURIComponent(returnTo)}`;
            }}
          >
            Sign in
          </button>
        </div>
      </div>
    );
  }

  if (orders === undefined) {
    return <div className="ws-shop"><div className="boot">Loading your orders…</div></div>;
  }

  if (orders === null) {
    // list_orders is login + customer gated: it resolves the signed-in user to a
    // linked Customer and 403s if there isn't one (e.g. a staff/admin login, or a
    // session with no customer contact). Order history is a customer-account
    // feature, so say that plainly instead of dumping the raw 403/exception.
    const permissionish = /403|forbidden|permission|not permitted|please sign in/i.test(error || '');
    return (
      <div className="ws-shop ws-cart-page">
        <div className="ws-empty ws-cart-guest">
          <h1 className="ws-pd-title">
            {permissionish ? 'No orders for this account' : 'Could not load your orders'}
          </h1>
          <p style={{ color: 'var(--muted)', maxWidth: 480, margin: '10px auto 20px', lineHeight: 1.6 }}>
            {permissionish
              ? 'Order history is available for customer accounts. If you’re signed in as staff, open the Customer Portal to view a specific customer’s orders.'
              : 'Something went wrong loading your orders — please try again in a moment.'}
          </p>
          <button className="ws-btn-gold" onClick={() => navigate('/shop')}>Continue shopping</button>
        </div>
      </div>
    );
  }

  return (
    <div className="ws-shop ws-cart-page ws-orders-page">
      <div className="ws-section-hd">
        <h1>Your Orders</h1>
        <span className="ws-section-count">{orders.length} order{orders.length === 1 ? '' : 's'}</span>
      </div>

      {orders.length === 0 ? (
        <div className="ws-empty ws-orders-empty">
          <p>No orders yet.</p>
          <button className="ws-btn-gold" onClick={() => navigate('/shop')}>Shop now</button>
        </div>
      ) : (
        <div className="ws-orders-table-wrap">
          <table className="ws-orders-table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Ordered</th>
                <th>Delivery</th>
                <th>Status</th>
                {showPrice && <th className="ws-orders-th-amount">Total</th>}
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.name}>
                  <td>
                    <button
                      type="button"
                      className="ws-orders-link"
                      onClick={() => navigate(`/orders/${encodeURIComponent(o.name)}`)}
                    >
                      {o.name}
                    </button>
                  </td>
                  <td>{o.transaction_date || '—'}</td>
                  <td>{o.delivery_date || '—'}</td>
                  <td>
                    <span className={`ws-order-status ws-order-status-${statusTone(o.status)}`}>
                      {o.status || '—'}
                    </span>
                  </td>
                  {showPrice && (
                    <td className="ws-orders-td-amount">{formatMoney(o.grand_total, o.currency)}</td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
