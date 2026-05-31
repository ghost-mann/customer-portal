import { useState } from 'react';
import { useStore } from '../store';
import Icon from '@shared/Icon';
import { fmtMoney, fmt } from '@shared/utils';

export default function CartDrawer() {
  const { cartOpen, cart, loadingCart, cartError, closeCart, updateQty, removeItem, submitQuotation, saveProfile } = useStore();
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileName, setProfileName] = useState('');
  const [savePromptOpen, setSavePromptOpen] = useState(false);

  if (!cartOpen) return null;

  async function checkout() {
    setSubmitting(true);
    try {
      await submitQuotation(notes);
    } catch (e) {} // error already in store
    finally { setSubmitting(false); }
  }

  async function doSaveProfile() {
    if (!profileName.trim()) return;
    setSavingProfile(true);
    try {
      await saveProfile(profileName.trim());
      setProfileName('');
      setSavePromptOpen(false);
    } catch (e) {} // toast handled in store
    finally { setSavingProfile(false); }
  }

  const items = cart?.items || [];

  return (
    <>
      <div className="drawer-bd" onClick={closeCart} />
      <div className="drawer">
        <div className="drawer-hd">
          <div className="drawer-title">
            Your cart
            <small>{cart?.name ? `DRAFT ${cart.name}` : 'Empty'}</small>
          </div>
          <button className="drawer-close" onClick={closeCart}><Icon name="close" /></button>
        </div>
        <div className="drawer-bd2">
          {loadingCart && <div className="loading">Loading cart</div>}
          {cartError && <div className="alert alert-err"><Icon name="error" />{cartError}</div>}

          {!loadingCart && items.length === 0 && (
            <div className="empty-cart">
              <Icon name="shopping_bag" />
              <div className="title">Your cart is empty</div>
              <div className="hint">Browse the catalogue and add items to build a request.</div>
              <button className="btn btn-secondary" onClick={closeCart}>
                <Icon name="arrow_back" />Keep browsing
              </button>
            </div>
          )}

          {items.length > 0 && (
            <>
              <div className="cart-list">
                {items.map((it) => (
                  <div className="cart-row" key={it.item_code}>
                    <div className="cart-img">
                      {it.image ? <img src={it.image} alt={it.item_name} /> : <div className="placeholder" />}
                    </div>
                    <div className="cart-meta">
                      <div className="cart-name">{it.item_name}</div>
                      <div className="cart-sub">{it.item_code}</div>
                      {it.rate > 0 && (
                        <div className="cart-rate">{fmtMoney(it.rate, cart.currency)} / {it.uom}</div>
                      )}
                      <div style={{ marginTop: 8 }}>
                        <div className="qty-picker" style={{ height: 32 }}>
                          <button className="qty-btn" style={{ width: 30, height: 30 }} onClick={() => updateQty(it.item_code, Math.max(0, it.qty - 1))}><Icon name="remove" /></button>
                          <input
                            className="qty-input"
                            style={{ width: 48, height: 30 }}
                            type="number"
                            min={0}
                            value={it.qty}
                            onChange={(e) => updateQty(it.item_code, parseFloat(e.target.value) || 0)}
                          />
                          <button className="qty-btn" style={{ width: 30, height: 30 }} onClick={() => updateQty(it.item_code, it.qty + 1)}><Icon name="add" /></button>
                        </div>
                      </div>
                    </div>
                    <div className="cart-actions">
                      <div className="cart-amount">{it.rate > 0 ? fmtMoney(it.amount, cart.currency) : '—'}</div>
                      <button className="cart-remove" onClick={() => removeItem(it.item_code)}>
                        <Icon name="delete" />Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="cart-summary">
                <div className="cart-line"><span>Item count</span><span>{items.length} variet{items.length === 1 ? 'y' : 'ies'}</span></div>
                <div className="cart-line"><span>Total quantity</span><span>{fmt(cart.total_qty)} {items[0]?.uom || 'units'}</span></div>
                <div className="cart-line"><span>Currency</span><span>{cart.currency || '—'}</span></div>
                {cart.total > 0 && (
                  <div className="cart-line total"><span>Estimated total</span><span className="v">{fmtMoney(cart.total, cart.currency)}</span></div>
                )}
              </div>

              <div style={{ marginTop: 18 }}>
                <label className="cart-line" style={{ display: 'block', padding: 0, marginBottom: 6, fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
                  Notes for the sales team
                </label>
                <textarea
                  className="cart-input"
                  style={{
                    width: '100%', padding: '10px 14px',
                    border: '1px solid var(--border)', borderRadius: 8,
                    fontFamily: 'var(--f)', fontSize: 13.5, color: 'var(--text)',
                    background: 'var(--surface)', resize: 'vertical', minHeight: 80, lineHeight: 1.55,
                  }}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Delivery date you need, special instructions, preferred stem length, etc."
                />
              </div>

              {/* Save the current cart as a reusable quick-buy profile */}
              <div style={{ marginTop: 16 }}>
                {!savePromptOpen ? (
                  <button className="btn btn-secondary" style={{ width: '100%' }} onClick={() => setSavePromptOpen(true)}>
                    <Icon name="bookmark_add" />Save as quick-buy profile
                  </button>
                ) : (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      className="cart-input"
                      autoFocus
                      style={{ flex: 1, padding: '9px 12px', border: '1px solid var(--border)', borderRadius: 8, fontFamily: 'var(--f)', fontSize: 13.5, background: 'var(--surface)' }}
                      placeholder="Profile name, e.g. Weekly mix"
                      value={profileName}
                      onChange={(e) => setProfileName(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') doSaveProfile(); }}
                    />
                    <button className="btn btn-primary" onClick={doSaveProfile} disabled={savingProfile || !profileName.trim()}>
                      <Icon name="bookmark" />{savingProfile ? 'Saving…' : 'Save'}
                    </button>
                  </div>
                )}
              </div>

              <div style={{ marginTop: 14, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button className="btn btn-secondary" onClick={closeCart} disabled={submitting}>
                  Keep browsing
                </button>
                <button className="btn btn-primary btn-big" onClick={checkout} disabled={submitting}>
                  <Icon name={submitting ? 'hourglass_empty' : 'send'} />
                  {submitting ? 'Submitting…' : 'Send request'}
                </button>
              </div>

              <div style={{ marginTop: 14, fontSize: 12, color: 'var(--text-3)', textAlign: 'center', lineHeight: 1.55 }}>
                Submitting this will create a Quotation request that our sales team reviews
                and confirms within one business day. You'll see it in your <a href="/customer-portal" style={{ color: 'var(--accent)', textDecoration: 'underline' }}>customer portal</a>.
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
