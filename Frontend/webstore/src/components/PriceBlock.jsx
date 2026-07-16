// Renders price + stock cues from get_product_info_for_website's
// `product_info`, gated by the embedded Webshop Settings — mirrors the
// server's own show/hide logic (product_info.py) so the client never shows
// something the API already decided to withhold.
export default function PriceBlock({ settings, productInfo, loading }) {
  if (!settings) return null;

  const price = productInfo && productInfo.price;
  const priceIsShowable = Boolean(settings.show_price);
  // The server already omits `price` entirely when hide_price_for_guest
  // applies (product_info.py) — an empty `{}` from a guest session under that
  // setting is the "sign in to see price" case, not "no price configured".
  const guestPriceHidden = !window.logged_in && Boolean(settings.hide_price_for_guest);

  const stock = (() => {
    if (!settings.show_stock_availability || !productInfo) return null;
    if (productInfo.on_backorder) return { text: 'On backorder', tone: 'warn' };
    if (productInfo.in_stock === false) return { text: 'Sold out', tone: 'bad' };
    if (productInfo.in_stock) {
      const showQty =
        settings.show_quantity_in_website &&
        productInfo.show_stock_qty &&
        productInfo.stock_qty != null;
      return {
        text: showQty ? `In stock (${Number(productInfo.stock_qty).toLocaleString()})` : 'In stock',
        tone: 'good',
      };
    }
    return null;
  })();

  return (
    <div className="ws-pd-price-block">
      {loading && <div className="ws-pd-price-muted">Loading price…</div>}
      {!loading && priceIsShowable && guestPriceHidden && (
        <div className="ws-pd-price-muted">Sign in to see price</div>
      )}
      {!loading && priceIsShowable && !guestPriceHidden && (
        price && price.formatted_price ? (
          <div className="ws-pd-price">{price.formatted_price}</div>
        ) : (
          <div className="ws-pd-price-muted">Price on request</div>
        )
      )}
      {!loading && stock && (
        <div className={`ws-pd-stock ws-pd-stock-${stock.tone}`}>{stock.text}</div>
      )}
    </div>
  );
}
