import { useEffect, useState } from 'react';
import { getSettings, getHome } from './lib/api';

export default function App() {
  const [state, setState] = useState({ loading: true });
  useEffect(() => {
    Promise.all([getSettings(), getHome()])
      .then(([settings, home]) => setState({ loading: false, settings, home }))
      .catch((e) => setState({ loading: false, error: String(e) }));
  }, []);

  if (state.loading) return <div className="boot">Loading Upande Webstore…</div>;
  if (state.error) return <div className="boot">Could not load the shop: {state.error}</div>;
  return (
    <div className="boot">
      <h1 style={{ fontFamily: 'var(--serif)' }}>Upande Webstore</h1>
      <p>{state.home.new_arrivals.length} products · {state.home.categories.length} categories</p>
    </div>
  );
}
