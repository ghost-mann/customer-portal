import { useRoute } from '../router';

// get_product_filter_data items carry no price/stem_length — those only
// appear on the detail page via get_product_info_for_website (RT3). Here we
// show name/image/item_group + a stock cue only.
function stockLabel(product) {
  if (product.on_backorder) return 'Backorder';
  if (!product.in_stock) return 'Sold out';
  return null;
}

export default function ProductCard({ product }) {
  const { navigate } = useRoute();
  const label = stockLabel(product);
  return (
    <button
      className="ws-card"
      onClick={() => navigate(`/p/${product.route}`)}
    >
      <div className="ws-card-img">
        {product.website_image
          ? <img src={product.website_image} alt={product.web_item_name} loading="lazy" />
          : <span aria-hidden="true" className="material-symbols-outlined ws-card-ph">local_florist</span>}
        {product.wished && <span className="ws-badge">Wishlisted</span>}
        {label && <span className="ws-badge ws-badge-muted">{label}</span>}
      </div>
      <div className="ws-card-body">
        <div className="ws-card-name">{product.web_item_name}</div>
        <div className="ws-card-group">{product.item_group}</div>
      </div>
    </button>
  );
}
