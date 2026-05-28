import { useState } from 'react';
import Icon from './Icon';
import { fmtMoney } from '../utils';
import { useStore } from '../store';

export default function ItemCard({ item }) {
  const { loadDetail, addToCart, openCart } = useStore();
  const [adding, setAdding] = useState(false);

  async function quickAdd(e) {
    e.stopPropagation();
    setAdding(true);
    try {
      await addToCart(item.item_code, 1);
      openCart();
    } finally {
      setAdding(false);
    }
  }

  const img = item.thumbnail || item.website_image;
  const hasPrice = item.price_list_rate != null;

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
      </div>
      <div className="item-body">
        {item.item_group && <div className="item-category">{item.item_group}</div>}
        <div className="item-name">{item.web_item_name || item.item_name}</div>
        <div className="item-price-row">
          {hasPrice
            ? <div className="item-price">{fmtMoney(item.price_list_rate, item.price_currency)}<small>/ {item.price_uom || item.stock_uom || 'each'}</small></div>
            : <div className="item-no-price">Price on request</div>}
          <button
            className={`item-add${adding ? ' disabled' : ''}`}
            onClick={quickAdd}
            title="Add one to cart"
            disabled={adding}
          >
            <Icon name={adding ? 'hourglass_empty' : 'add'} />
          </button>
        </div>
      </div>
    </div>
  );
}
