import { useState } from 'react';
import Icon from '@shared/Icon';
import { fmtMoney } from '@shared/utils';
import { useStore } from '../store';

export default function ItemCard({ item }) {
  const { loadDetail, addToCart, openCart } = useStore();
  const [adding, setAdding] = useState(false);

  // A variety carries one or more stem-length options (sorted shortest first).
  const options = item.options && item.options.length ? item.options : [{
    item_code: item.item_code, stem_length: null,
    price_list_rate: item.price_list_rate, price_currency: item.price_currency,
    price_uom: item.price_uom, stock_uom: item.stock_uom,
  }];
  const multi = options.length > 1;

  const priced = options.filter((o) => o.price_list_rate != null);
  const priceMin = priced.length ? Math.min(...priced.map((o) => o.price_list_rate)) : null;
  const priceMax = priced.length ? Math.max(...priced.map((o) => o.price_list_rate)) : null;
  const ccy = (priced[0] || options[0]).price_currency || item.price_currency;
  const uom = options[0].price_uom || options[0].stock_uom || item.stock_uom || 'stem';
  const hasPrice = priceMin != null;
  const rangePrice = hasPrice && priceMin !== priceMax;

  // Single-length varieties keep a true quick-add; multi-length open the selector.
  const defaultOpt = priced[0] || options[0];
  const lo = options[0].stem_length;
  const hi = options[options.length - 1].stem_length;

  async function quickAdd(e) {
    e.stopPropagation();
    setAdding(true);
    try { await addToCart(defaultOpt.item_code, 1); openCart(); }
    finally { setAdding(false); }
  }
  function openSelector(e) { e.stopPropagation(); loadDetail(item.name); }

  const img = item.thumbnail || item.website_image;

  return (
    <div className="item-card" onClick={() => loadDetail(item.name)}>
      <div className="item-img-wrap">
        {img
          ? <img className="item-img" src={img} alt={item.web_item_name || item.item_name} loading="lazy" />
          : <div className="item-img-placeholder"><Icon name="local_florist" /></div>}
        {(item.in_season || (item.farms && item.farms.length > 0)) && (
          <div className="item-tag-row">
            {item.in_season && <span className="item-tag in-season">In season</span>}
            {item.farms?.slice(0, 1).map((f) => (
              <span key={f} className="item-tag farm">{f}</span>
            ))}
          </div>
        )}
        {multi && <span className="item-variants">{options.length} lengths</span>}
      </div>
      <div className="item-body">
        {item.item_group && <div className="item-category">{item.item_group}</div>}
        <div className="item-name">{item.web_item_name || item.item_name}</div>

        {multi && (lo || hi) && (
          <div className="item-lengths-hint">
            <Icon name="straighten" />
            {lo && hi ? `${lo} – ${hi}` : `${options.length} lengths`}
          </div>
        )}

        <div className="item-price-row">
          {hasPrice
            ? <div className="item-price">{rangePrice && <span className="from">from </span>}{fmtMoney(priceMin, ccy)}<small>/ {uom}</small></div>
            : <div className="item-no-price">Price on request</div>}
          {multi
            ? (
              <button className="item-add select" onClick={openSelector} title="Choose stem length">
                <Icon name="tune" />
              </button>
            ) : (
              <button
                className={`item-add${adding ? ' disabled' : ''}`}
                onClick={quickAdd}
                title="Add one to cart"
                disabled={adding}
              >
                <Icon name={adding ? 'hourglass_empty' : 'add'} />
              </button>
            )}
        </div>
      </div>
    </div>
  );
}
