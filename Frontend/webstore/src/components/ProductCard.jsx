import { useRoute } from '../router';
import { useStore } from '../store';
import { isLoggedIn } from '../lib/auth';

function priceLabel(p, settings) {
  const guestHidden = settings?.hide_price_for_guest && !isLoggedIn();
  if (guestHidden) return 'Sign in for price';
  if (p.price_min == null) return 'Enquire';
  const cur = p.currency || '';
  if (p.price_max != null && p.price_max !== p.price_min)
    return `${cur} ${p.price_min.toFixed(2)} – ${p.price_max.toFixed(2)}`;
  return `${cur} ${p.price_min.toFixed(2)}`;
}

export default function ProductCard({ product }) {
  const { navigate } = useRoute();
  const settings = useStore((s) => s.settings);
  return (
    <button className="ws-card" onClick={() => navigate(`/product/${encodeURIComponent(product.name)}`)}>
      <div className="ws-card-img">
        {product.image
          ? <img src={product.image} alt={product.web_item_name} loading="lazy" />
          : <span className="material-symbols-outlined ws-card-ph">local_florist</span>}
        {product.has_offer && <span className="ws-badge">Offer</span>}
        {!product.in_stock && <span className="ws-badge ws-badge-muted">Sold out</span>}
      </div>
      <div className="ws-card-body">
        <div className="ws-card-name">{product.web_item_name}</div>
        <div className="ws-card-group">{product.item_group}</div>
        {settings?.show_stem_length && product.stem_lengths?.length > 0 && (
          <div className="ws-card-lengths">{product.stem_lengths.join(' · ')}</div>
        )}
        <div className="ws-card-price">{priceLabel(product, settings)}</div>
      </div>
    </button>
  );
}
