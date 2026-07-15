import { useStore } from '../store';
import Icon from '@shared/Icon';
import { fmt } from '@shared/utils';

const NAV = [
  { group: 'Workspace', items: [
    { key: 'overview', label: 'Overview', icon: 'dashboard' },
  ]},
  { group: 'Activity', items: [
    { key: 'orders',     label: 'Orders',    icon: 'receipt_long', countKey: 'open_orders' },
    { key: 'shipments',  label: 'Shipments', icon: 'local_shipping', countKey: 'in_flight' },
    { key: 'invoices',   label: 'Invoices',  icon: 'request_quote', countKey: 'overdue' },
  ]},
  { group: 'Support', items: [
    { key: 'claims',      label: 'Claims',      icon: 'report',  countKey: 'open_claims' },
    { key: 'suggestions', label: 'Suggestions', icon: 'lightbulb' },
    { key: 'messages',    label: 'Messages',    icon: 'mail' },
  ]},
  { group: 'Profile', items: [
    { key: 'account', label: 'Account', icon: 'badge' },
    // External link back to the Frappe Desk — shown only to staff/desk users.
    { key: 'desk', label: 'Back to Desk', icon: 'arrow_back', href: '/app', staffOnly: true },
  ]},
];

export default function Sidebar() {
  const { page, setPage, data, ctx } = useStore();
  const k = data.overview?.kpis || {};
  const isStaff = !!(ctx?.is_staff || ctx?.is_account_manager);

  return (
    <aside className="side">
      {NAV.map((g) => (
        <div key={g.group}>
          <div className="side-label">{g.group}</div>
          <div className="side-grp">
            {g.items.filter((it) => !it.staffOnly || isStaff).map((it) => {
              const count = it.countKey ? k[it.countKey] : null;
              // External links (e.g. Back to Desk) render as anchors, not SPA pages.
              if (it.href) {
                return (
                  <a key={it.key} href={it.href} className="nav-item">
                    <Icon name={it.icon} />
                    <span>{it.label}</span>
                  </a>
                );
              }
              return (
                <div
                  key={it.key}
                  className={`nav-item${page === it.key ? ' active' : ''}`}
                  onClick={() => setPage(it.key)}
                >
                  <Icon name={it.icon} />
                  <span>{it.label}</span>
                  {count != null && count > 0 && <span className="nav-cnt">{fmt(count)}</span>}
                </div>
              );
            })}
          </div>
        </div>
      ))}
      <div className="side-foot">Live</div>
    </aside>
  );
}
