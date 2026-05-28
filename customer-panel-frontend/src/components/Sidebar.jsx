import { useStore } from '../store';
import Icon from './Icon';
import { fmt } from '../utils';

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
  ]},
];

export default function Sidebar() {
  const { page, setPage, data } = useStore();
  const k = data.overview?.kpis || {};

  return (
    <aside className="side">
      {NAV.map((g) => (
        <div key={g.group}>
          <div className="side-label">{g.group}</div>
          <div className="side-grp">
            {g.items.map((it) => {
              const count = it.countKey ? k[it.countKey] : null;
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
