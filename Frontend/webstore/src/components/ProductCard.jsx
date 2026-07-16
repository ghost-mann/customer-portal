import { useRoute } from '../router';
import { useStore } from '../store';
import WishlistButton from './WishlistButton';
import ProductImage from './ProductImage';

// get_product_filter_data items carry no price/stem_length — those only
// appear on the detail page via get_product_info_for_website (RT3). Here we
// show name/image/item_group + a stock cue only.
//
// `in_stock`/`on_backorder` are only present on the list payload when
// Webshop Settings.show_stock_availability is ON (default OFF) — with it
// off, `in_stock` is `undefined` on every item, so this must be gated on
// the setting (not just a loose falsy check) or every card reads "Sold out".
// Mirrors Wishlist.jsx's inline stock badge logic.
function stockLabel(product, showStock) {
  if (!showStock) return null;
  if (product.on_backorder) return 'Backorder';
  if (product.in_stock === false) return 'Sold out';
  return null;
}

export default function ProductCard({ product }) {
  const { navigate } = useRoute();
  const settings = useStore((s) => s.settings);
  const enableWishlist = Boolean(settings && settings.enable_wishlist);
  const label = stockLabel(product, Boolean(settings && settings.show_stock_availability));

  function go() { navigate(`/p/${product.route}`); }
  function onKeyDown(e) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      go();
    }
  }

  return (
    <div
      className="ws-card"
      role="link"
      tabIndex={0}
      onClick={go}
      onKeyDown={onKeyDown}
    >
      <div className="ws-card-img">
        <ProductImage
          src={product.website_image}
          alt={product.web_item_name}
          placeholder={<span aria-hidden="true" className="material-symbols-outlined ws-card-ph">local_florist</span>}
        />
        {enableWishlist && (
          <WishlistButton
            itemCode={product.item_code}
            wished={product.wished}
            className="ws-card-wish"
          />
        )}
        {label && <span className="ws-badge ws-badge-muted">{label}</span>}
      </div>
      <div className="ws-card-body">
        <div className="ws-card-name">{product.web_item_name}</div>
        <div className="ws-card-group">{product.item_group}</div>
      </div>
    </div>
  );
}
