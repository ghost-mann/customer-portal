import { useEffect } from 'react';
import { useStore } from './store';
import { useRoute } from './router';
import Nav from './components/Nav';
import Footer from './components/Footer';

export default function App() {
  const { loading, error, home, bootstrap } = useStore();
  const { page } = useRoute();

  useEffect(() => { bootstrap(); }, []);

  return (
    <>
      <Nav />
      <main>
        {loading && <div className="boot">Loading Upande Webstore…</div>}
        {error && <div className="boot">Could not load the shop: {error}</div>}
        {!loading && !error && (
          <div className="boot">
            <h1>Upande Webstore</h1>
            <p>Route: <strong>{page}</strong> · {home?.new_arrivals?.length ?? 0} products</p>
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
