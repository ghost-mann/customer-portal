import { useStore } from '../store';
import { initials, shortUser } from '../utils';
import Icon from './Icon';

export default function Nav() {
  const { ctx, filters, setFilter, cart, openCart } = useStore();
  const itemCount = cart?.item_count || 0;

  return (
    <nav className="nav">
      <a href="/portal" className="brand">
        <div className="brand-mark">AF</div>
        <span>agriflow</span>
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
        <a className="nav-link" href="/portal" title="Back to portal">
          <Icon name="apps" />
          <span>Portal</span>
        </a>
        <a className="nav-link" href="/customer-portal" title="Customer panel">
          <Icon name="person" />
          <span>My account</span>
        </a>
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
