import { useEffect } from 'react';
import { useStore } from '../store';
import { fmtDate, fmtMoneyCompact as fmtMoney } from '@shared/utils';
import Card from '../components/Card';
import Badge from '../components/Badge';
import Icon from '@shared/Icon';
import EmptyState from '../components/EmptyState';

export default function Invoices() {
  const { data, loadList } = useStore();
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
                  <tr key={r.name}>
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
                        href={`/api/method/frappe.utils.print_format.download_pdf?doctype=Sales+Invoice&name=${encodeURIComponent(r.name)}&format=Standard&no_letterhead=0`}
                        target="_blank"
                        rel="noreferrer"
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
    </>
  );
}
