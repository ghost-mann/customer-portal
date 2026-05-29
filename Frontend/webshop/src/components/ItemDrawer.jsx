import { useEffect, useState } from 'react';
import { useStore } from '../store';
import Icon from '@shared/Icon';
import { fmtMoney } from '@shared/utils';

export default function ItemDrawer() {
  const { detail, closeDetail, addToCart, openCart } = useStore();
  const [qty, setQty] = useState(1);
  const [adding, setAdding] = useState(false);
  const [err, setErr] = useState(null);

  useEffect(() => { setQty(1); setErr(null); }, [detail?.item?.name]);

  if (!detail) return null;

  async function add() {
    if (!detail.item) return;
    setAdding(true); setErr(null);
    try {
      await addToCart(detail.item.item_code, qty);
      closeDetail();
      openCart();
    } catch (e) { setErr(e.message); }
    finally { setAdding(false); }
  }

  const item = detail.item;
  const img = item?.website_image || item?.thumbnail;
  const hasPrice = item?.price_list_rate != null;

  return (
    <>
      <div className="drawer-bd" onClick={closeDetail} />
      <div className="drawer">
        <div className="drawer-hd">
          <div className="drawer-title">
            {item?.web_item_name || item?.item_name || 'Loading'}
            <small>{item?.item_code}</small>
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

              <div className="detail-buy">
                <div>
                  {hasPrice ? (
                    <div className="detail-price">
                      {fmtMoney(item.price_list_rate, item.price_currency)}
                      <small>per {item.price_uom || item.stock_uom || 'each'}{item.min_qty ? ` · min ${item.min_qty}` : ''}</small>
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
