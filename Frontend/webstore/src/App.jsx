import { useEffect } from 'react';
import { useStore } from './store';
import { useRoute } from './router';

export default function App() {
  const { loading, error, home, bootstrap } = useStore();
  const { page } = useRoute();

  useEffect(() => { bootstrap(); }, []);

  if (loading) return <div className="boot">Loading Upande Webstore…</div>;
  if (error) return <div className="boot">Could not load the shop: {error}</div>;
  return (
    <div className="boot">
      <h1>Upande Webstore</h1>
      <p>Route: <strong>{page}</strong> · {home?.new_arrivals?.length ?? 0} products</p>
    </div>
  );
}
