import { useEffect, useState } from 'react';
import Nav from './components/Nav';
import Landing from './pages/Landing';
import SignedOut from './pages/SignedOut';
import { api, getBoot } from '@shared/api';

export default function App() {
  const [ctx, setCtx] = useState({ loading: true, ...getBoot() });

  useEffect(() => {
    // Always re-check user context against the server: the boot block may be stale
    // (cached) and the tile permissions should reflect current state.
    (async () => {
      try {
        const r = await api('agriflow.api.portal.get_user_context');
        setCtx({
          loading: false,
          user: r.user,
          fullName: r.full_name,
          isGuest: r.is_guest,
          tiles: r.tiles || {},
        });
      } catch (e) {
        const boot = getBoot();
        setCtx({ loading: false, ...boot, error: e.message });
      }
    })();
  }, []);

  async function onLogout() {
    try { await api('logout', {}); } catch (e) {}
    window.location.href = '/login';
  }

  return (
    <>
      <Nav
        user={ctx.user}
        fullName={ctx.fullName}
        isGuest={ctx.isGuest}
        onLogout={onLogout}
      />
      {ctx.loading ? (
        <div className="shell">
          <div className="center">
            <div className="loading-box">Loading your portal</div>
          </div>
        </div>
      ) : ctx.isGuest ? (
        <SignedOut />
      ) : (
        <Landing fullName={ctx.fullName} tiles={ctx.tiles} />
      )}
      <footer className="foot">
        <div>AGRIFLOW · UPANDE LTD</div>
        <div className="foot-links">
          <a href="/about">About</a>
          <a href="/contact">Contact</a>
          <a href="mailto:support@upande.com">Support</a>
        </div>
      </footer>
    </>
  );
}
