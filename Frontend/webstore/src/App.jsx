import { useEffect } from 'react';
import { useStore } from './store';
import { useRoute } from './router';
import Nav from './components/Nav';
import Footer from './components/Footer';
import Shop from './pages/Shop';
import Product from './pages/Product';

export default function App() {
  const { loading, error, bootstrap } = useStore();
  const { page } = useRoute();

  useEffect(() => { bootstrap(); }, []);

  return (
    <>
      <Nav />
      <main>
        {loading && <div className="boot">Loading Upande Webstore…</div>}
        {error && <div className="boot">Could not load the shop: {error}</div>}
        {!loading && !error && page === 'shop' && <Shop />}
        {!loading && !error && page === 'product' && <Product />}
        {!loading && !error && page !== 'shop' && page !== 'product' && (
          <div className="boot"><h1>Coming soon</h1><p>The “{page}” page ships in a later phase.</p></div>
        )}
      </main>
      <Footer />
    </>
  );
}
