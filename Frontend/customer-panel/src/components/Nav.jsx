import { useStore } from '../store';
import { initials, shortUser } from '@shared/utils';
import Icon from '@shared/Icon';
import Logo from '@shared/Logo';
import { api } from '@shared/api';
import ImpersonatePicker from '@shared/ImpersonatePicker';

export default function Nav({ ctx }) {
  const { impersonate, setImpersonate } = useStore();
  // Instance company name from get_my_context (api/customer.py); falls back to Upande
  // until context loads (ctx is null during the initial load state).
  const company = ctx?.instance_company || 'Upande';
  async function onLogout() {
    try { await api('logout', {}); } catch (e) {}
    window.location.href = '/login';
  }
  return (
    <nav className="nav">
      <a href="/customer-portal" className="brand">
        <div className="brand-mark"><Logo /></div>
        <b>{company}</b>
      </a>
      <div className="brand-sub">Customer portal</div>
      <div className="nav-right">
        <ImpersonatePicker
          ctx={ctx}
          impersonate={impersonate}
          setImpersonate={setImpersonate}
          title="Staff: switch customer"
          clearLabel="Stop impersonating (back to default)"
        />
        <a className="nav-link" href="/website-shop">
          <Icon name="storefront" style={{ fontSize: 15, marginRight: 4, verticalAlign: -3 }} />
          Shop
        </a>
        {ctx?.user && (
          <div className="user-chip" title={ctx.user}>
            <div className="av">{initials(ctx.full_name || ctx.user)}</div>
            <span>{ctx.full_name || shortUser(ctx.user)}</span>
            <span className="logout" onClick={onLogout}>Sign out</span>
          </div>
        )}
      </div>
    </nav>
  );
}
