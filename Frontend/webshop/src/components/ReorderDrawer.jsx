import { useStore } from '../store';
import Icon from '@shared/Icon';
import { fmtDate, fmtMoney, fmt } from '@shared/utils';

// Quick-buy hub: re-order straight from a past order, or drop a saved profile
// back into the cart. Flower buying is repetitive, so this is the fast path.
export default function ReorderDrawer() {
  const {
    reorderOpen, closeReorder, loadingReorder,
    recentOrders, profiles, reorderFromOrder, loadProfile, deleteProfile,
  } = useStore();

  if (!reorderOpen) return null;

  const orders = recentOrders || [];
  const profs = profiles || [];

  function preview(items, n = 3) {
    const names = (items || []).map((i) => i.item_name || i.item_code);
    const head = names.slice(0, n).join(', ');
    const more = names.length > n ? ` +${names.length - n} more` : '';
    return (head || '—') + more;
  }

  return (
    <>
      <div className="drawer-bd" onClick={closeReorder} />
      <div className="drawer">
        <div className="drawer-hd">
          <div className="drawer-title">
            Quick buy
            <small>Reorder in one click</small>
          </div>
          <button className="drawer-close" onClick={closeReorder}><Icon name="close" /></button>
        </div>
        <div className="drawer-bd2">
          {/* Saved profiles */}
          <div className="ro-section-hd">
            <Icon name="bookmark" />
            <span>Saved quick-buy profiles</span>
          </div>
          {profs.length === 0 && (
            <div className="ro-empty">
              No saved profiles yet. Build a cart, then “Save as quick-buy profile” to reuse it.
            </div>
          )}
          {profs.map((p) => (
            <div className="ro-card" key={p.name}>
              <div className="ro-card-main">
                <div className="ro-card-title">
                  <Icon name="bookmark" style={{ fontSize: 15, color: 'var(--accent)' }} />
                  {p.profile_name}
                </div>
                <div className="ro-card-sub">{p.item_count} item{p.item_count === 1 ? '' : 's'} · {preview(p.items)}</div>
                {p.notes && <div className="ro-card-note">{p.notes}</div>}
              </div>
              <div className="ro-card-actions">
                <button className="btn btn-primary btn-sm" onClick={() => loadProfile(p.name)} title="Add these items to your cart">
                  <Icon name="add_shopping_cart" />Add to cart
                </button>
                <button className="ro-del" onClick={() => deleteProfile(p.name)} title="Delete profile">
                  <Icon name="delete" />
                </button>
              </div>
            </div>
          ))}

          {/* Recent orders */}
          <div className="ro-section-hd" style={{ marginTop: 26 }}>
            <Icon name="history" />
            <span>Recent orders</span>
          </div>
          {loadingReorder && <div className="loading">Loading orders</div>}
          {!loadingReorder && orders.length === 0 && (
            <div className="ro-empty">No past orders yet.</div>
          )}
          {orders.map((o) => (
            <div className="ro-card" key={o.name}>
              <div className="ro-card-main">
                <div className="ro-card-title">
                  <span className="ro-id">{o.name}</span>
                  <span className={`ro-status ro-status-${(o.status || '').toLowerCase().replace(/\s+/g, '-')}`}>{o.status}</span>
                </div>
                <div className="ro-card-sub">
                  {fmtDate(o.transaction_date)} · {o.item_count} item{o.item_count === 1 ? '' : 's'}
                  {o.grand_total > 0 && <> · {fmtMoney(o.grand_total, o.currency)}</>}
                </div>
                <div className="ro-card-note">{preview(o.items)}</div>
              </div>
              <div className="ro-card-actions">
                <button className="btn btn-secondary btn-sm" onClick={() => reorderFromOrder(o.name)} title="Add this order's items to your cart">
                  <Icon name="replay" />Reorder
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
