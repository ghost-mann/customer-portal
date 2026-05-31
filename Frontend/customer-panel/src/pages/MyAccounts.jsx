import { useEffect, useRef, useState } from 'react';
import { useStore } from '../store';
import { api } from '@shared/api';
import { avatarBg, fmt, fmtDate, initials } from '@shared/utils';
import Icon from '@shared/Icon';

// Sales-rep landing: the portfolio of accounts this user manages. Selecting an
// account enters that customer's portal via the existing impersonation flow.
// Broad staff additionally get a search box to reach any customer.
export default function MyAccounts() {
  const { ctx, setImpersonate } = useStore();
  const [q, setQ] = useState('');
  const [rows, setRows] = useState(null);
  const [loading, setLoading] = useState(true);
  const debRef = useRef(null);

  const canSearchAll = !!ctx?.can_search_all;

  useEffect(() => { load(''); }, []);

  async function load(search) {
    setLoading(true);
    try {
      const r = await api('customer_portal.api.customer.list_my_accounts', { search, limit: 200 });
      setRows(r || []);
    } catch (e) { setRows([]); }
    finally { setLoading(false); }
  }

  function onSearch(v) {
    setQ(v);
    clearTimeout(debRef.current);
    debRef.current = setTimeout(() => load(v.trim()), 220);
  }

  const name = ctx?.full_name || ctx?.user || '';
  const subtitle = q.trim() && canSearchAll
    ? `Search results for “${q.trim()}”`
    : 'Accounts you manage';

  return (
    <div style={{ maxWidth: 1080, margin: '0 auto', padding: '40px 24px 64px' }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontFamily: 'var(--serif)', fontSize: 28, fontWeight: 400, letterSpacing: '-0.01em' }}>
          My Accounts
        </div>
        <div style={{ fontSize: 13.5, color: 'var(--text-2)', marginTop: 6 }}>
          {name && <>Welcome back, <strong>{name}</strong>. </>}{subtitle}.
        </div>
      </div>

      <div className="card" style={{ marginBottom: 18 }}>
        <div style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <Icon name="search" style={{ fontSize: 18, color: 'var(--text-3)' }} />
          <input
            autoFocus
            placeholder={canSearchAll ? 'Search your accounts, or any customer by name / ID…' : 'Search your accounts…'}
            value={q}
            onChange={(e) => onSearch(e.target.value)}
            style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontFamily: 'var(--f)', fontSize: 14, color: 'var(--text)' }}
          />
          {loading && <span className="loading" style={{ padding: 0, fontSize: 11 }}>…</span>}
        </div>
      </div>

      {!loading && rows?.length === 0 && (
        <div className="empty" style={{ padding: '48px 0' }}>
          <Icon name={q.trim() ? 'search_off' : 'storefront'} />
          {q.trim() ? 'No accounts match your search.' : 'You have no accounts assigned yet.'}
        </div>
      )}

      <div className="acct-grid">
        {rows?.map((a) => (
          <button key={a.name} className="acct-card" onClick={() => setImpersonate(a.name)}>
            <div className="acct-top">
              <div className="acct-av" style={{ background: avatarBg(a.customer_name || a.name) }}>
                {initials(a.customer_name || a.name)}
              </div>
              <div style={{ minWidth: 0 }}>
                <div className="acct-name">{a.customer_name || a.name}</div>
                <div className="acct-id">{a.name}</div>
              </div>
              <Icon name="arrow_forward" className="acct-go" />
            </div>

            <div className="acct-meta">
              {a.customer_group && <span className="cl-badge">{a.customer_group}</span>}
              {a.territory && <span className="cl-badge">{a.territory}</span>}
            </div>

            <div className="acct-stats">
              <div className="acct-stat">
                <div className="acct-stat-val">{fmt(a.open_orders || 0)}</div>
                <div className="acct-stat-lbl">Open orders</div>
              </div>
              <div className="acct-stat">
                <div className={`acct-stat-val${a.overdue_invoices > 0 ? ' warn' : ''}`}>{fmt(a.overdue_invoices || 0)}</div>
                <div className="acct-stat-lbl">Overdue inv.</div>
              </div>
              <div className="acct-stat">
                <div className="acct-stat-val sm">{a.last_activity ? fmtDate(a.last_activity) : '—'}</div>
                <div className="acct-stat-lbl">Last order</div>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
