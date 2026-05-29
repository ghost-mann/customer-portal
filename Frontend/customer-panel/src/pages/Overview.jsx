import { useStore } from '../store';
import { fmt, fmtMoneyCompact as fmtMoney, fmtDate } from '@shared/utils';
import Card from '../components/Card';
import Badge from '../components/Badge';
import Icon from '@shared/Icon';
import EmptyState from '../components/EmptyState';

const KPI_DEFS = [
  { key: 'open_orders', label: 'Open orders',       sub: 'Awaiting delivery', page: 'orders',    icon: 'receipt_long' },
  { key: 'in_flight',   label: 'Shipments in flight', sub: 'On the way',      page: 'shipments', icon: 'local_shipping' },
  { key: 'overdue',     label: 'Outstanding invoices', sub: 'To pay',         page: 'invoices',  icon: 'request_quote' },
  { key: 'open_claims', label: 'Open claims',         sub: 'In review',       page: 'claims',    icon: 'report' },
];

export default function Overview() {
  const { data, setPage } = useStore();
  const ov = data.overview;

  if (!ov) return <div className="loading">Loading</div>;
  if (ov.error) return <div className="alert alert-err"><Icon name="error" />{ov.error}</div>;

  return (
    <>
      <div className="kpis">
        {KPI_DEFS.map((d) => (
          <div className="kpi" key={d.key} onClick={() => setPage(d.page)}>
            <div className="kpi-lbl">{d.label}</div>
            <div className="kpi-val">{fmt(ov.kpis?.[d.key] || 0)}</div>
            <div className="kpi-sub">{d.sub}</div>
          </div>
        ))}
      </div>

      <div className="grid g2">
        <Card
          title="Recent orders"
          sub="Last 5"
          action={<a className="btn btn-secondary" onClick={() => setPage('orders')}>View all <Icon name="arrow_forward" /></a>}
          flush
        >
          {ov.recent_orders?.length ? (
            <table className="tbl">
              <thead><tr><th>Order</th><th>Date</th><th>Status</th><th className="right">Amount</th></tr></thead>
              <tbody>
                {ov.recent_orders.map((r) => (
                  <tr key={r.name} className="clickable" onClick={() => setPage('orders')}>
                    <td className="id">{r.name}</td>
                    <td className="id">{fmtDate(r.transaction_date)}</td>
                    <td><Badge value={r.status} /></td>
                    <td className="num">{fmtMoney(r.grand_total, r.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <EmptyState icon="receipt_long" title="No orders yet" />}
        </Card>

        <Card
          title="Recent shipments"
          sub="Last 5"
          action={<a className="btn btn-secondary" onClick={() => setPage('shipments')}>View all <Icon name="arrow_forward" /></a>}
          flush
        >
          {ov.recent_shipments?.length ? (
            <table className="tbl">
              <thead><tr><th>Shipment</th><th>Date</th><th>AWB</th><th>Status</th></tr></thead>
              <tbody>
                {ov.recent_shipments.map((r) => (
                  <tr key={r.name} className="clickable" onClick={() => setPage('shipments')}>
                    <td className="id">{r.name}</td>
                    <td className="id">{fmtDate(r.posting_date)}</td>
                    <td className="id">{r.lr_no || '—'}</td>
                    <td><Badge value={r.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <EmptyState icon="local_shipping" title="No shipments yet" />}
        </Card>
      </div>
    </>
  );
}
