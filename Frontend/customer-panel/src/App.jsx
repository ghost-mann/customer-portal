import { useEffect } from 'react';
import { useStore } from './store';
import Nav from './components/Nav';
import Sidebar from './components/Sidebar';
import Icon from '@shared/Icon';

import Overview from './pages/Overview';
import MyAccounts from './pages/MyAccounts';
import Orders from './pages/Orders';
import Shipments from './pages/Shipments';
import Claims from './pages/Claims';
import Suggestions from './pages/Suggestions';
import Invoices from './pages/Invoices';
import Messages from './pages/Messages';
import Account from './pages/Account';

const PAGE_META = {
  overview:    { title: 'Overview',    sub: 'AT A GLANCE · YOUR ACCOUNT' },
  orders:      { title: 'Orders',      sub: 'SALES ORDERS · STATUS · DELIVERY' },
  shipments:   { title: 'Shipments',   sub: 'PACKAGE TRACKING · AWB · ETA' },
  claims:      { title: 'Claims',      sub: 'QUALITY · DELIVERY · INVOICE' },
  suggestions: { title: 'Suggestions', sub: 'IDEAS · COMPLIMENTS · FEEDBACK' },
  invoices:    { title: 'Invoices',    sub: 'STATEMENTS · OUTSTANDING · PDF' },
  messages:    { title: 'Messages',    sub: 'COMMUNICATIONS · ACCOUNT MANAGER' },
  account:     { title: 'Account',    sub: 'COMPANY · MANAGER · SETTINGS' },
};

const PAGES = {
  overview: Overview,
  orders: Orders,
  shipments: Shipments,
  claims: Claims,
  suggestions: Suggestions,
  invoices: Invoices,
  messages: Messages,
  account: Account,
};

export default function App() {
  const { page, ctx, loading, loadError, bootstrap } = useStore();

  useEffect(() => { bootstrap(); }, []);

  // Initial load / error state
  if (loading) {
    return (
      <>
        <Nav ctx={null} />
        <div style={{ height: 'calc(100vh - 56px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="loading">Loading your portal</div>
        </div>
      </>
    );
  }
  if (loadError) {
    return (
      <>
        <Nav ctx={null} />
        <div style={{ height: 'calc(100vh - 56px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ maxWidth: 460, textAlign: 'center' }}>
            <Icon name="block" style={{ fontSize: 38, color: 'var(--text-3)' }} />
            <div style={{ fontFamily: 'var(--serif)', fontSize: 22, marginTop: 12, marginBottom: 8 }}>Can't reach your customer record</div>
            <div style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.6, marginBottom: 18 }}>{loadError}</div>
            <a className="btn btn-primary" href="/login">
              <Icon name="arrow_back" /> Sign in again
            </a>
          </div>
        </div>
      </>
    );
  }

  // Rep/staff with no account selected yet — show their portfolio.
  if (ctx?.needs_impersonation) {
    return (
      <>
        <Nav ctx={ctx} />
        <div style={{ height: 'calc(100vh - 56px)', background: 'var(--bg)', overflowY: 'auto' }}>
          <MyAccounts />
        </div>
      </>
    );
  }

  const meta = PAGE_META[page] || PAGE_META.overview;
  const Page = PAGES[page] || Overview;
  const { impersonate, setImpersonate } = useStore.getState();
  // Viewing an account other than the user's own contact link.
  const viewingAccount = (ctx?.is_staff || ctx?.is_account_manager) && impersonate;

  return (
    <>
      <Nav ctx={ctx} />
      {viewingAccount && (
        <div style={{
          background: 'var(--accent-soft)',
          borderBottom: '1px solid var(--border-2)',
          padding: '7px 24px',
          fontFamily: 'var(--mono)',
          fontSize: 11,
          color: 'var(--accent-2)',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}>
          <button
            onClick={() => setImpersonate(null)}
            title="Back to My Accounts"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              background: 'transparent', border: '1px solid var(--border-2)', borderRadius: 6,
              color: 'var(--accent-2)', cursor: 'pointer', padding: '3px 9px',
              fontFamily: 'var(--mono)', fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.1em',
            }}
          >
            <Icon name="arrow_back" style={{ fontSize: 13 }} /> My Accounts
          </button>
          <Icon name="visibility" style={{ fontSize: 14, marginLeft: 4 }} />
          Viewing account <strong style={{ marginLeft: 4 }}>{ctx.customer_name} ({ctx.customer})</strong>
        </div>
      )}
      <div className="app" style={{ height: viewingAccount ? 'calc(100vh - 56px - 32px)' : 'calc(100vh - 56px)' }}>
        <Sidebar />
        <main className="main">
          <div className="main-hd">
            <div>
              <div className="main-title">{meta.title}</div>
              <div className="main-sub">{meta.sub}</div>
            </div>
            {ctx?.customer_name && (
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{ctx.customer_name}</div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 10.5, color: 'var(--text-3)', marginTop: 3, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  {ctx.customer}
                </div>
              </div>
            )}
          </div>
          <div className="main-body">
            <Page />
          </div>
        </main>
      </div>
    </>
  );
}
