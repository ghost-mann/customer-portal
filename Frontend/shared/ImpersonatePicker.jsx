import { useEffect, useRef, useState } from 'react';
import { api } from '@shared/api';
import Icon from '@shared/Icon';
import './ImpersonatePicker.css';

// Staff-only customer impersonation picker, shared by the webshop and customer
// panel. Store-agnostic: the host app passes ctx + impersonate state and the
// setter as props (each app keeps its own Zustand store).
//
//   <ImpersonatePicker
//     ctx={ctx}
//     impersonate={impersonate}
//     setImpersonate={setImpersonate}
//     title="Staff: shop on behalf of a customer"
//     clearLabel="Stop impersonating"
//   />
export default function ImpersonatePicker({
  ctx,
  impersonate,
  setImpersonate,
  title = 'Staff: switch customer',
  clearLabel = 'Stop impersonating',
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [rows, setRows] = useState(null);
  const [loading, setLoading] = useState(false);
  const wrapRef = useRef(null);
  const inputRef = useRef(null);
  const debRef = useRef(null);

  useEffect(() => {
    function onClick(e) { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); }
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);

  useEffect(() => {
    if (!open) return;
    setTimeout(() => inputRef.current?.focus(), 30);
    fetchList('');
  }, [open]);

  async function fetchList(search) {
    setLoading(true);
    try {
      const r = await api('agriflow.api.customer.list_customers', { search, limit: 30 });
      setRows(r || []);
    } catch (e) { setRows([]); }
    finally { setLoading(false); }
  }

  function onInput(e) {
    const v = e.target.value;
    setQ(v);
    clearTimeout(debRef.current);
    debRef.current = setTimeout(() => fetchList(v.trim()), 220);
  }

  if (!ctx?.is_staff) return null;

  const label = impersonate
    ? `Viewing as: ${impersonate}`
    : (ctx.customer ? `Viewing as: ${ctx.customer}` : 'Pick a customer');

  return (
    <div className="imp-wrap" ref={wrapRef}>
      <button className="imp-btn" onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }} title={title}>
        <Icon name="visibility" style={{ fontSize: 14 }} />
        <span>{label}</span>
        <Icon name="expand_more" style={{ fontSize: 13, opacity: 0.7 }} />
      </button>
      {open && (
        <div className="imp-drop">
          <div className="imp-search">
            <Icon name="search" />
            <input
              ref={inputRef}
              placeholder="Search customer…"
              value={q}
              onChange={onInput}
            />
          </div>
          {impersonate && (
            <div className="imp-item imp-clear" onClick={() => { setImpersonate(null); setOpen(false); }}>
              <Icon name="close" />
              <span>{clearLabel}</span>
            </div>
          )}
          <div className="imp-list">
            {loading && <div className="imp-empty">Searching…</div>}
            {!loading && rows && rows.length === 0 && <div className="imp-empty">No customers match.</div>}
            {!loading && rows && rows.map((r) => (
              <div
                key={r.name}
                className={`imp-item${impersonate === r.name ? ' active' : ''}`}
                onClick={() => { setImpersonate(r.name); setOpen(false); }}
              >
                <div className="imp-item-name">{r.customer_name || r.name}</div>
                <div className="imp-item-meta">
                  <span className="imp-id">{r.name}</span>
                  {r.customer_group && <span>{r.customer_group}</span>}
                  {r.territory && <span>{r.territory}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
