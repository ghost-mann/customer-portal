import { useEffect } from 'react';
import { useStore } from '../store';
import { fmt, fmtDate, fmtMoneyCompact as fmtMoney } from '@shared/utils';
import Card from '../components/Card';
import Badge from '../components/Badge';
import Icon from '@shared/Icon';
import EmptyState from '../components/EmptyState';
import Drawer from '../components/Drawer';

const pdfUrl = (name) =>
  `/api/method/frappe.utils.print_format.download_pdf?doctype=Sales+Invoice&name=${encodeURIComponent(name)}&format=Standard&no_letterhead=0`;

export default function Invoices() {
  const { data, loadList, loadDetail, detail, setDetail } = useStore();
  useEffect(() => { if (data.invoices.rows == null) loadList('invoices'); }, []);
  const { rows, err } = data.invoices;

  if (rows == null) return <div className="loading">Loading invoices</div>;
  if (err) return <div className="alert alert-err"><Icon name="error" />{err}</div>;

  const overdue = rows.filter((r) => (r.status || '').toLowerCase() === 'overdue');
  const outstanding = rows.reduce((a, r) => a + (parseFloat(r.outstanding_amount) || 0), 0);

  return (
    <>
      {overdue.length > 0 && (
        <div className="alert alert-err" style={{ marginTop: 0 }}>
          <Icon name="warning" />
          <div>
            <strong>{overdue.length} invoice{overdue.length === 1 ? '' : 's'} overdue</strong> — total outstanding {fmtMoney(outstanding)}.
            Please clear these to keep deliveries flowing.
          </div>
        </div>
      )}

      <Card
        title="Invoices"
        sub={`${rows.length} invoice${rows.length === 1 ? '' : 's'} on file`}
        flush
      >
        {rows.length ? (
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Invoice</th>
                  <th>Date</th>
                  <th>Due</th>
                  <th>PO</th>
                  <th>Status</th>
                  <th className="right">Total</th>
                  <th className="right">Outstanding</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.name} className="clickable" onClick={() => loadDetail('invoices', r.name)}>
                    <td className="id">{r.name}</td>
                    <td className="id">{fmtDate(r.posting_date)}</td>
                    <td className="id">{fmtDate(r.due_date)}</td>
                    <td className="id">{r.po_no || '—'}</td>
                    <td><Badge value={r.status} /></td>
                    <td className="num">{fmtMoney(r.grand_total, r.currency)}</td>
                    <td className="num" style={{ fontWeight: (parseFloat(r.outstanding_amount) || 0) > 0 ? 600 : 400 }}>
                      {fmtMoney(r.outstanding_amount, r.currency)}
                    </td>
                    <td className="right">
                      <a
                        className="btn btn-secondary"
                        style={{ height: 26, padding: '0 10px', fontSize: 11.5 }}
                        href={pdfUrl(r.name)}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Icon name="download" /> PDF
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <EmptyState icon="request_quote" title="No invoices yet" />}
      </Card>

      <InvoiceDrawer detail={detail} onClose={() => setDetail(null)} />
    </>
  );
}

function InvoiceDrawer({ detail, onClose }) {
  const open = detail?.kind === 'invoices';
  if (!open) return null;
  const d = detail.doc;
  return (
    <Drawer open={open} title={detail.name} sub="Invoice" onClose={onClose}>
      {detail.loading && <div className="loading">Loading invoice</div>}
      {detail.err && <div className="alert alert-err"><Icon name="error" />{detail.err}</div>}
      {d && (
        <>
          <div className="summary-row"><span className="sr-label">Status</span><span className="sr-value"><Badge value={d.status} /></span></div>
          <div className="summary-row"><span className="sr-label">Posted</span><span className="sr-value">{fmtDate(d.posting_date)}</span></div>
          <div className="summary-row"><span className="sr-label">Due</span><span className="sr-value">{fmtDate(d.due_date)}</span></div>
          <div className="summary-row"><span className="sr-label">PO number</span><span className="sr-value mono">{d.po_no || '—'}</span></div>
          <div className="summary-row"><span className="sr-label">Total</span><span className="sr-value">{fmtMoney(d.grand_total, d.currency)}</span></div>
          <div className="summary-row"><span className="sr-label">Outstanding</span><span className="sr-value">{fmtMoney(d.outstanding_amount, d.currency)}</span></div>

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
                      <td>{it.item_code}{it.item_name && it.item_name !== it.item_code ? <><br /><span style={{ color: 'var(--text-3)', fontSize: 10.5 }}>{it.item_name}</span></> : null}</td>
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
            <a className="btn btn-primary" href={pdfUrl(d.name)} target="_blank" rel="noreferrer">
              <Icon name="download" /> Download PDF
            </a>
            <div className="spacer" />
          </div>
        </>
      )}
    </Drawer>
  );
}
