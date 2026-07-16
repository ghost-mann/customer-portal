import { brand } from '../brand';
import { useStore } from '../store';
import ProductCard from '../components/ProductCard';

// RT1 landing: a real product grid sourced from get_product_filter_data.
// Filters/search/pagination land in RT2; this page renders whatever the
// store already holds after bootstrap().
export default function Shop() {
  const items = useStore((s) => s.items);
  const itemsCount = useStore((s) => s.itemsCount);

  return (
    <div className="ws-shop">
      <section className="ws-hero ws-hero-compact">
        <div className="ws-hero-inner">
          <div className="ws-hero-eyebrow">{brand.hero.eyebrow}</div>
          <h1 className="ws-hero-title">{brand.hero.title}</h1>
          <p className="ws-hero-sub">{brand.hero.subtitle}</p>
        </div>
      </section>

      <section className="ws-section">
        <div className="ws-section-hd">
          <h2>Shop</h2>
          <span className="ws-section-count">{itemsCount} item{itemsCount === 1 ? '' : 's'}</span>
        </div>

        {items.length === 0 ? (
          <div className="ws-empty">No products found.</div>
        ) : (
          <div className="ws-grid">
            {items.map((p) => <ProductCard key={p.name} product={p} />)}
          </div>
        )}
      </section>
    </div>
  );
}
