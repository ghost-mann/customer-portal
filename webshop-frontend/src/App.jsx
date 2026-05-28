import { useEffect } from 'react';
import { useStore } from './store';
import Nav from './components/Nav';
import Sidebar from './components/Sidebar';
import ItemDrawer from './components/ItemDrawer';
import CartDrawer from './components/CartDrawer';
import Catalog from './pages/Catalog';
import Confirmation from './pages/Confirmation';
import Icon from './components/Icon';
import { fmt } from './utils';

export default function App() {
  const { bootstrap, loadingCtx, ctxError, ctx, view, filters, items, detail, cartOpen } = useStore();

  useEffect(() => { bootstrap(); }, []);

  // Debounce search input → reload items 220ms after the user stops typing
  useEffect(() => {
    const handle = setTimeout(() => useStore.getState().loadItems(), 220);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.search]);

  if (loadingCtx) {
    return (
      <>
        <Nav />
        <div style={{ height: 'calc(100vh - 60px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="loading">Loading shop</div>
        </div>
      </>
    );
  }

  if (ctxError) {
    return (
      <>
        <Nav />
        <div style={{ height: 'calc(100vh - 60px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ maxWidth: 500, textAlign: 'center' }}>
            <Icon name="storefront" style={{ fontSize: 42, color: 'var(--text-3)' }} />
            <div style={{ fontFamily: 'var(--serif)', fontSize: 24, margin: '14px 0 8px' }}>
              Can't open the shop
            </div>
            <div style={{ fontSize: 13.5, color: 'var(--text-2)', lineHeight: 1.6, marginBottom: 18 }}>
              {ctxError}
            </div>
            <a className="btn btn-primary" href="/portal">
              <Icon name="arrow_back" />Back to portal
            </a>
          </div>
        </div>
      </>
    );
  }

  if (view === 'confirmation') {
    return (
      <>
        <Nav />
        <div style={{ height: 'calc(100vh - 60px)', overflowY: 'auto', background: 'var(--bg)' }}>
          <Confirmation />
        </div>
      </>
    );
  }

  return (
    <>
      <Nav />
      <div className="app">
        <Sidebar />
        <main className="main">
          <div className="main-hd">
            <div>
              <div className="main-title">{filters.category || 'All varieties'}</div>
              <div className="main-sub">
                {items ? `${items.length} ITEM${items.length === 1 ? '' : 'S'}` : 'LOADING'}
                {filters.inSeason && ' · IN SEASON'}
                {filters.farm && ` · ${filters.farm}`}
              </div>
            </div>
            {ctx?.customer_name && (
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{ctx.customer_name}</div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 10.5, color: 'var(--text-3)', marginTop: 3, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  {ctx.customer || 'No customer linked'}
                </div>
              </div>
            )}
          </div>
          <div className="main-body">
            <Catalog />
          </div>
        </main>
      </div>
      {detail && <ItemDrawer />}
      {cartOpen && <CartDrawer />}
    </>
  );
}
