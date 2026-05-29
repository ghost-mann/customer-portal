import { useEffect } from 'react';
import { useStore } from '../store';
import { fmt, fmtDate, fmtDateTime, fmtMoneyCompact as fmtMoney } from '@shared/utils';
import Card from '../components/Card';
import Badge from '../components/Badge';
import Icon from '@shared/Icon';
import EmptyState from '../components/EmptyState';
import Drawer from '../components/Drawer';

export default function Shipments() {
  const { data, loadList, loadDetail, detail, setDetail } = useStore();

  useEffect(() => { if (data.shipments.rows == null) loadList('shipments'); }, []);
  const { rows, err } = data.shipments;

  if (rows == null) return <div className="loading">Loading shipments</div>;
  if (err) return <div className="alert alert-err"><Icon name="error" />{err}</div>;

  return (
    <>
      <Card
        title="Shipments & tracking"
        sub={`${rows.length} shipment${rows.length === 1 ? '' : 's'}`}
        flush
      >
        {rows.length ? (
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Shipment</th>
                  <th>Date</th>
                  <th>AWB / LR</th>
                  <th>Transporter</th>
                  <th>Vehicle</th>
                  <th>Status</th>
                  <th className="right">Value</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.name} className="clickable" onClick={() => loadDetail('shipments', r.name)}>
                    <td className="id">{r.name}</td>
                    <td className="id">{fmtDate(r.posting_date)}</td>
                    <td className="id">{r.lr_no || '—'}</td>
                    <td>{r.transporter_name || '—'}</td>
                    <td className="id">{r.vehicle_no || '—'}</td>
                    <td><Badge value={r.status} /></td>
                    <td className="num">{fmtMoney(r.grand_total, r.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <EmptyState icon="local_shipping" title="No shipments yet" hint="Your delivery notes will appear here once they're issued." />}
      </Card>

      <ShipmentDrawer detail={detail} onClose={() => setDetail(null)} />
    </>
  );
}

function buildTimeline(d) {
  if (!d) return [];
  const submitted = !!d.docstatus && d.docstatus >= 1;
  const dispatched = !!d.lr_no || !!d.vehicle_no || submitted;
  const inTransit  = !!d.lr_no && !['Completed','Closed'].includes(d.status);
  const delivered  = ['Completed','Closed'].includes(d.status);
  return [
    { label: 'Order picked & packed', meta: d.posting_date ? `Posted ${fmtDate(d.posting_date)}` : '', state: submitted ? 'done' : 'pending' },
    { label: 'Dispatched',            meta: d.lr_date ? `AWB issued ${fmtDate(d.lr_date)}` : (d.lr_no ? `AWB ${d.lr_no}` : ''), state: dispatched ? 'done' : 'pending' },
    { label: 'In transit',            meta: d.transporter_name ? `Carrier: ${d.transporter_name}` : '', state: inTransit ? 'active' : (delivered ? 'done' : 'pending') },
    { label: 'Delivered',             meta: delivered ? 'Confirmed' : (d.status || ''), state: delivered ? 'done' : 'pending' },
  ];
}

function ShipmentDrawer({ detail, onClose }) {
  const open = detail?.kind === 'shipments';
  if (!open) return null;
  const d = detail.doc;
  return (
    <Drawer open={open} title={detail.name} sub="Shipment" onClose={onClose}>
      {detail.loading && <div className="loading">Loading shipment</div>}
      {detail.err && <div className="alert alert-err"><Icon name="error" />{detail.err}</div>}
      {d && (
        <>
          <div className="summary-row"><span className="sr-label">Status</span><span className="sr-value"><Badge value={d.status} /></span></div>
          <div className="summary-row"><span className="sr-label">AWB / LR</span><span className="sr-value mono">{d.lr_no || '—'}</span></div>
          <div className="summary-row"><span className="sr-label">AWB date</span><span className="sr-value">{fmtDate(d.lr_date)}</span></div>
          <div className="summary-row"><span className="sr-label">Transporter</span><span className="sr-value">{d.transporter_name || '—'}</span></div>
          <div className="summary-row"><span className="sr-label">Vehicle</span><span className="sr-value mono">{d.vehicle_no || '—'}</span></div>
          <div className="summary-row"><span className="sr-label">PO number</span><span className="sr-value mono">{d.po_no || '—'}</span></div>
          <div className="summary-row"><span className="sr-label">Posted</span><span className="sr-value">{fmtDateTime(d.posting_date)}</span></div>
          <div className="summary-row"><span className="sr-label">Value</span><span className="sr-value">{fmtMoney(d.grand_total, d.currency)}</span></div>

          <div className="divider" />
          <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 12 }}>
            Tracking
          </div>
          <div className="timeline">
            {buildTimeline(d).map((tl, i) => (
              <div key={i} className={`tl-item ${tl.state}`}>
                <div className="tl-dot" />
                <div className="tl-label">{tl.label}</div>
                {tl.meta && <div className="tl-meta">{tl.meta}</div>}
              </div>
            ))}
          </div>

          {Array.isArray(d.items) && d.items.length > 0 && (
            <>
              <div className="divider" />
              <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 8 }}>
                Contents ({d.items.length} item{d.items.length === 1 ? '' : 's'})
              </div>
              <table className="tbl">
                <thead><tr><th>Item</th><th className="right">Qty</th><th className="right">Amount</th></tr></thead>
                <tbody>
                  {d.items.map((it, i) => (
                    <tr key={i}>
                      <td>{it.item_code}{it.item_name && it.item_name !== it.item_code ? <><br /><span style={{color:'var(--text-3)',fontSize:10.5}}>{it.item_name}</span></> : null}</td>
                      <td className="num">{fmt(it.qty)} {it.uom}</td>
                      <td className="num">{fmtMoney(it.amount, d.currency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}

          <div className="divider" />
          <div className="action-row" style={{ marginTop: 0, paddingTop: 0, border: 'none' }}>
            <a className="btn btn-secondary" href={`/app/delivery-note/${encodeURIComponent(d.name)}`} target="_blank" rel="noreferrer">
              <Icon name="open_in_new" /> Open in Desk
            </a>
            <div className="spacer" />
            <a className="btn btn-primary" href={`/printview?doctype=Delivery%20Note&name=${encodeURIComponent(d.name)}&format=Standard&no_letterhead=0&letterhead=No%20Letterhead&settings=%7B%7D&_lang=en`} target="_blank" rel="noreferrer">
              <Icon name="picture_as_pdf" /> Packing slip
            </a>
          </div>
        </>
      )}
    </Drawer>
  );
}
