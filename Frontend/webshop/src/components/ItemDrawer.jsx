import { useEffect, useState } from 'react';
import { useStore } from '../store';
import Icon from '@shared/Icon';
import { fmtMoney } from '@shared/utils';

export default function ItemDrawer() {
  const { detail, closeDetail, addToCart, openCart } = useStore();
  const [qty, setQty] = useState(1);
  const [sel, setSel] = useState(0);
  const [adding, setAdding] = useState(false);
  const [err, setErr] = useState(null);

  const item = detail?.item;
  const options = item?.options && item.options.length ? item.options : (item ? [{
    item_code: item.item_code, stem_length: null,
    price_list_rate: item.price_list_rate, price_currency: item.price_currency,
    price_uom: item.price_uom, stock_uom: item.stock_uom,
  }] : []);

  // Reset qty + default to the first priced length whenever the item changes.
  useEffect(() => {
    setQty(1); setErr(null);
    const fp = options.findIndex((o) => o.price_list_rate != null);
    setSel(fp === -1 ? 0 : fp);
  }, [item?.name]);

  if (!detail) return null;

  const opt = options[sel] || options[0] || {};
  const multi = options.length > 1;

  async function add() {
    if (!opt.item_code) return;
    setAdding(true); setErr(null);
    try {
      await addToCart(opt.item_code, qty);
      closeDetail();
      openCart();
    } catch (e) { setErr(e.message); }
    finally { setAdding(false); }
  }

  const img = item?.website_image || item?.thumbnail;
  const hasPrice = opt.price_list_rate != null;

  return (
    <>
      <div className="drawer-bd" onClick={closeDetail} />
      <div className="drawer">
        <div className="drawer-hd">
          <div className="drawer-title">
            {item?.web_item_name || item?.item_name || 'Loading'}
            <small>{opt.item_code}</small>
          </div>
          <button className="drawer-close" onClick={closeDetail}><Icon name="close" /></button>
        </div>
        <div className="drawer-bd2">
          {detail.loading && <div className="loading">Loading item</div>}
          {detail.err && <div className="alert alert-err"><Icon name="error" />{detail.err}</div>}
          {item && (
            <>
              <div className="detail-img">
                {img ? <img src={img} alt={item.web_item_name} /> : <div className="placeholder"><Icon name="local_florist" /></div>}
              </div>
              <div className="detail-name">{item.web_item_name || item.item_name}</div>
              <div className="detail-tags">
                {item.item_group && <span className="tag-chip">{item.item_group}</span>}
                {item.in_season && <span className="tag-chip in-season">In season</span>}
                {(item.farms || []).map((f) => <span key={f} className="tag-chip farm">{f}</span>)}
                {item.brand && <span className="tag-chip">{item.brand}</span>}
              </div>
              {item.web_long_description
                ? <div className="detail-desc" dangerouslySetInnerHTML={{ __html: item.web_long_description }} />
                : item.description && <div className="detail-desc">{item.description}</div>}

              {multi && (
                <div className="detail-lengths">
                  <div className="detail-lengths-label">
                    <Icon name="straighten" />Choose stem length
                  </div>
                  <div className="length-grid">
                    {options.map((o, i) => (
                      <button
                        key={o.item_code}
                        type="button"
                        className={`length-opt${i === sel ? ' active' : ''}`}
                        onClick={() => setSel(i)}
                      >
                        <span className="lo-cm">{o.stem_length || o.item_name}</span>
                        <span className="lo-price">
                          {o.price_list_rate != null ? fmtMoney(o.price_list_rate, o.price_currency) : 'On request'}
                        </span>
                        {i === sel && <Icon name="check_circle" className="lo-check" />}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="detail-buy">
                <div>
                  {hasPrice ? (
                    <div className="detail-price">
                      {fmtMoney(opt.price_list_rate, opt.price_currency)}
                      <small>per {opt.price_uom || opt.stock_uom || item.stock_uom || 'each'}</small>
                    </div>
                  ) : (
                    <div>
                      <div className="detail-price" style={{ fontSize: 16, fontWeight: 500 }}>Price on request</div>
                      <small style={{ fontSize: 11, color: 'var(--text-3)' }}>Sales team will quote on submission</small>
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div className="qty-picker">
                    <button className="qty-btn" onClick={() => setQty(Math.max(1, qty - 1))}>
                      <Icon name="remove" />
                    </button>
                    <input
                      className="qty-input"
                      type="number"
                      min={1}
                      value={qty}
                      onChange={(e) => setQty(Math.max(1, parseInt(e.target.value) || 1))}
                    />
                    <button className="qty-btn" onClick={() => setQty(qty + 1)}>
                      <Icon name="add" />
                    </button>
                  </div>
                  <button className="btn btn-primary btn-big" onClick={add} disabled={adding}>
                    <Icon name={adding ? 'hourglass_empty' : 'shopping_bag'} />
                    {adding ? 'Adding…' : 'Add to cart'}
                  </button>
                </div>
              </div>

              {err && <div className="alert alert-err"><Icon name="error" />{err}</div>}
            </>
          )}
        </div>
      </div>
    </>
  );
}
