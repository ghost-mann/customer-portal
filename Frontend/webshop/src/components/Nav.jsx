import { useStore } from '../store';
import { initials, shortUser } from '@shared/utils';
import Icon from '@shared/Icon';
import Logo from '@shared/Logo';
import ImpersonatePicker from '@shared/ImpersonatePicker';

export default function Nav() {
  const { ctx, filters, setFilter, cart, openCart, openReorder, impersonate, setImpersonate } = useStore();
  const itemCount = cart?.item_count || 0;
  const hasCustomer = !!ctx?.customer || !!impersonate;

  return (
    <nav className="nav">
      <a href="/customer-portal" className="brand">
        <div className="brand-mark"><Logo /></div>
        <span>Karen Roses</span>
      </a>
      <div className="brand-sub">Shop</div>

      <div className="search-bar">
        <Icon name="search" />
        <input
          placeholder="Search varieties, brands, codes…"
          value={filters.search}
          onChange={(e) => setFilter({ search: e.target.value })}
        />
        {filters.search && (
          <button className="clear-btn" onClick={() => setFilter({ search: '' })}>
            <Icon name="close" style={{ fontSize: 16 }} />
          </button>
        )}
      </div>

      <div className="nav-right">
        <ImpersonatePicker
          ctx={ctx}
          impersonate={impersonate}
          setImpersonate={setImpersonate}
          title="Staff: shop on behalf of a customer"
          clearLabel="Stop impersonating"
        />
        <a className="nav-link" href="/customer-portal" title="Customer portal">
          <Icon name="person" />
          <span>My account</span>
        </a>
        {hasCustomer && (
          <button className="nav-link" onClick={openReorder} title="Reorder from past orders or saved profiles">
            <Icon name="replay" />
            <span>Quick buy</span>
          </button>
        )}
        <button className="cart-btn" onClick={openCart}>
          <Icon name="shopping_bag" />
          Cart
          {itemCount > 0 && <span className="cart-count">{itemCount}</span>}
        </button>
        {ctx?.user && (
          <div className="user-chip" title={ctx.user}>
            <div className="av">{initials(ctx.full_name || ctx.user)}</div>
            <span>{shortUser(ctx.user)}</span>
          </div>
        )}
      </div>
    </nav>
  );
}
