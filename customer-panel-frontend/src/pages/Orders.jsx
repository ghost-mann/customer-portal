import { useEffect, useState } from 'react';
import { useStore } from '../store';
import { fmt, fmtDate, fmtMoney } from '../utils';
import Card from '../components/Card';
import Badge from '../components/Badge';
import Icon from '../components/Icon';
import EmptyState from '../components/EmptyState';
import Drawer from '../components/Drawer';

const FILTERS = [
  { key: 'all',     label: 'All' },
  { key: 'open',    label: 'Open' },
  { key: 'delivery',label: 'To deliver' },
  { key: 'billed',  label: 'Billed' },
  { key: 'closed',  label: 'Closed' },
];

function matchesFilter(row, f) {
  const s = (row.status || '').toLowerCase();
  if (f === 'all') return true;
  if (f === 'open') return !['completed', 'closed', 'cancelled'].includes(s);
  if (f === 'delivery') return s === 'to deliver' || s === 'to deliver and bill' || s.includes('deliver');
  if (f === 'billed') return s === 'to bill' || s.includes('bill');
  if (f === 'closed') return ['completed', 'closed'].includes(s);
  return true;
}

export default function Orders() {
  const { data, loadList, loadDetail, detail, setDetail } = useStore();
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    if (data.orders.rows == null) loadList('orders');
  }, []);

  const { rows, err } = data.orders;

  if (rows == null) return <div className="loading">Loading orders</div>;
  if (err) return <div className="alert alert-err"><Icon name="error" />{err}</div>;
  const filtered = rows.filter((r) => matchesFilter(r, filter));

  return (
    <>
      <Card
        title="Sales orders"
        sub={`${filtered.length} of ${rows.length} order${rows.length === 1 ? '' : 's'}`}
        action={
          <div style={{ display: 'flex', gap: 4 }}>
            {FILTERS.map((f) => (
              <button
                key={f.key}
                className={`btn ${filter === f.key ? 'btn-primary' : 'btn-secondary'}`}
                style={{ height: 28, padding: '0 10px', fontSize: 11.5 }}
                onClick={() => setFilter(f.key)}
              >
                {f.label}
              </button>
            ))}
          </div>
        }
        flush
      >
        {filtered.length ? (
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>PO</th>
                  <th>Ordered</th>
                  <th>Delivery</th>
                  <th>Status</th>
                  <th className="right">Delivered</th>
                  <th className="right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.name} className="clickable" onClick={() => loadDetail('orders', r.name)}>
                    <td className="id">{r.name}</td>
                    <td className="id">{r.po_no || '—'}</td>
                    <td className="id">{fmtDate(r.transaction_date)}</td>
                    <td className="id">{fmtDate(r.delivery_date)}</td>
                    <td><Badge value={r.status} /></td>
                    <td className="num">{fmt(r.per_delivered)}%</td>
                    <td className="num">{fmtMoney(r.grand_total, r.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <EmptyState icon="receipt_long" title={`No orders ${filter === 'all' ? 'yet' : `with status "${filter}"`}`} />}
      </Card>

      <OrderDrawer detail={detail} onClose={() => setDetail(null)} />
    </>
  );
}

function OrderDrawer({ detail, onClose }) {
  const open = detail?.kind === 'orders';
  if (!open) return null;
  const d = detail.doc;
  return (
    <Drawer open={open} title={detail.name} sub="Sales order" onClose={onClose}>
      {detail.loading && <div className="loading">Loading order</div>}
      {detail.err && <div className="alert alert-err"><Icon name="error" />{detail.err}</div>}
      {d && (
        <>
          <div className="summary-row"><span className="sr-label">Status</span><span className="sr-value"><Badge value={d.status} /></span></div>
          <div className="summary-row"><span className="sr-label">PO number</span><span className="sr-value mono">{d.po_no || '—'}</span></div>
          <div className="summary-row"><span className="sr-label">Ordered</span><span className="sr-value">{fmtDate(d.transaction_date)}</span></div>
          <div className="summary-row"><span className="sr-label">Delivery</span><span className="sr-value">{fmtDate(d.delivery_date)}</span></div>
          <div className="summary-row"><span className="sr-label">Currency</span><span className="sr-value">{d.currency}</span></div>
          <div className="summary-row"><span className="sr-label">Total</span><span className="sr-value">{fmtMoney(d.grand_total, d.currency)}</span></div>
          <div className="summary-row"><span className="sr-label">Delivered</span><span className="sr-value">{fmt(d.per_delivered)}%</span></div>
          <div className="summary-row"><span className="sr-label">Billed</span><span className="sr-value">{fmt(d.per_billed)}%</span></div>

          {Array.isArray(d.items) && d.items.length > 0 && (
            <>
              <div className="divider" />
              <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 8 }}>
                Items ({d.items.length})
              </div>
              <table className="tbl">
                <thead><tr><th>Item</th><th className="right">Qty</th><th className="right">Rate</th><th className="right">Amount</th></tr></thead>
                <tbody>
                  {d.items.map((it, i) => (
                    <tr key={i}>
                      <td>{it.item_code}{it.item_name && it.item_name !== it.item_code ? <><br /><span style={{color:'var(--text-3)',fontSize:10.5}}>{it.item_name}</span></> : null}</td>
                      <td className="num">{fmt(it.qty)} {it.uom}</td>
                      <td className="num">{fmtMoney(it.rate, d.currency)}</td>
                      <td className="num">{fmtMoney(it.amount, d.currency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}

          <div className="divider" />
          <div className="action-row" style={{ marginTop: 0, paddingTop: 0, border: 'none' }}>
            <a className="btn btn-secondary" href={`/app/sales-order/${encodeURIComponent(d.name)}`} target="_blank" rel="noreferrer">
              <Icon name="open_in_new" /> Open in Desk
            </a>
            <div className="spacer" />
          </div>
        </>
      )}
    </Drawer>
  );
}
