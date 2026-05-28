import { useEffect, useState } from 'react';
import { useStore } from '../store';
import { api } from '../api';
import Icon from '../components/Icon';

export default function PickCustomer() {
  const { setImpersonate } = useStore();
  const [q, setQ] = useState('');
  const [rows, setRows] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(''); }, []);

  async function load(s) {
    setLoading(true);
    try {
      const r = await api('agriflow.api.customer.list_customers', { search: s, limit: 30 });
      setRows(r || []);
    } catch (e) { setRows([]); }
    finally { setLoading(false); }
  }

  return (
    <div style={{ height: '100%', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '64px 24px' }}>
      <div style={{ maxWidth: 540, width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 56, height: 56, borderRadius: '50%',
            background: 'var(--accent-soft)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: 16,
          }}>
            <Icon name="storefront" style={{ fontSize: 28, color: 'var(--accent-2)' }} />
          </div>
          <div style={{ fontFamily: 'var(--serif)', fontSize: 26, fontWeight: 400, letterSpacing: '-0.01em', marginBottom: 8 }}>
            Pick a customer to view
          </div>
          <div style={{ fontSize: 13.5, color: 'var(--text-2)', lineHeight: 1.6 }}>
            You're signed in as staff — the customer portal needs a customer context. Choose any active customer below to see what they see.
          </div>
        </div>

        <div className="card">
          <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', background: 'var(--surface-2)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <Icon name="search" style={{ fontSize: 17, color: 'var(--text-3)' }} />
            <input
              autoFocus
              placeholder="Search customer name or ID…"
              value={q}
              onChange={(e) => { setQ(e.target.value); load(e.target.value.trim()); }}
              style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontFamily: 'var(--f)', fontSize: 14, color: 'var(--text)' }}
            />
          </div>
          <div style={{ maxHeight: 360, overflowY: 'auto' }}>
            {loading && <div className="loading">Searching</div>}
            {!loading && rows?.length === 0 && <div className="empty"><Icon name="search_off" />No customers match</div>}
            {!loading && rows?.map((r) => (
              <div
                key={r.name}
                className="imp-item"
                style={{ padding: '12px 16px' }}
                onClick={() => setImpersonate(r.name)}
              >
                <div className="imp-item-name">{r.customer_name || r.name}</div>
                <div className="imp-item-meta">
                  <span className="imp-id">{r.name}</span>
                  {r.customer_group && <span>{r.customer_group}</span>}
                  {r.territory && <span>{r.territory}</span>}
                  {r.customer_type && <span>{r.customer_type}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
