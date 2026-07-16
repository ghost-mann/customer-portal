import { brand } from '../brand';
import { useRoute } from '../router';
import { isLoggedIn } from '../lib/auth';

export default function Nav() {
  const { navigate } = useRoute();
  const loggedIn = isLoggedIn();
  return (
    <header className="ws-nav">
      <button className="ws-brand" onClick={() => navigate('/')}>
        <span className="ws-brand-mark">{brand.name[0]}</span>
        <span className="ws-brand-name">{brand.name}</span>
      </button>
      <nav className="ws-nav-links">
        <button onClick={() => navigate('/shop')}>Shop</button>
        <button onClick={() => navigate('/bouquets')}>Bouquets</button>
        <button onClick={() => navigate('/wishlist')}>Wishlist</button>
      </nav>
      <div className="ws-nav-right">
        <a className="ws-account" href={loggedIn ? '/customer-portal' : '/login?redirect-to=/upande-webstore'}>
          <span className="material-symbols-outlined">person</span>
          {loggedIn ? 'Account' : 'Sign in'}
        </a>
        <button className="ws-cart" onClick={() => navigate('/cart')}>
          <span className="material-symbols-outlined">shopping_bag</span>
          <span className="ws-cart-count">0</span>
        </button>
      </div>
    </header>
  );
}
