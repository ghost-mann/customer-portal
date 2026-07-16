import { brand } from '../brand';
import { useStore } from '../store';
import ProductCard from '../components/ProductCard';
import FilterRail from '../components/FilterRail';

function Pagination() {
  const settings = useStore((s) => s.settings);
  const itemsCount = useStore((s) => s.itemsCount);
  const start = useStore((s) => s.query.start);
  const goToStart = useStore((s) => s.goToStart);

  const perPage = (settings && settings.products_per_page) || 12;
  const totalPages = Math.max(1, Math.ceil(itemsCount / perPage));
  const currentPage = Math.floor(start / perPage) + 1;

  if (totalPages <= 1) return null;

  // Small page-number window around the current page, plus first/last.
  const pages = new Set([1, totalPages, currentPage - 1, currentPage, currentPage + 1]);
  const shown = Array.from(pages).filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b);

  return (
    <nav className="ws-pagination" aria-label="Pagination">
      <button
        className="ws-page-btn"
        disabled={currentPage <= 1}
        onClick={() => goToStart(Math.max(0, start - perPage))}
      >
        Prev
      </button>
      {shown.map((p, i) => (
        <span key={p} style={{ display: 'contents' }}>
          {i > 0 && p - shown[i - 1] > 1 && <span className="ws-page-ellipsis">…</span>}
          <button
            className={`ws-page-btn${p === currentPage ? ' ws-page-active' : ''}`}
            onClick={() => goToStart((p - 1) * perPage)}
          >
            {p}
          </button>
        </span>
      ))}
      <button
        className="ws-page-btn"
        disabled={currentPage >= totalPages}
        onClick={() => goToStart(start + perPage)}
      >
        Next
      </button>
    </nav>
  );
}

// RT2 shop: filter rail (search/category/field/attribute filters) + product
// grid, both driven by get_product_filter_data query_args, plus pagination
// from items_count + settings.products_per_page.
export default function Shop() {
  const items = useStore((s) => s.items);
  const itemsCount = useStore((s) => s.itemsCount);
  const filtering = useStore((s) => s.filtering);

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

        <div className="ws-shop-layout">
          <FilterRail />

          <div className="ws-shop-main">
            {items.length === 0 ? (
              <div className="ws-empty">
                {filtering ? 'Loading…' : 'No products match these filters.'}
              </div>
            ) : (
              <div className={`ws-grid${filtering ? ' ws-grid-loading' : ''}`}>
                {items.map((p) => <ProductCard key={p.name} product={p} />)}
              </div>
            )}
            <Pagination />
          </div>
        </div>
      </section>
    </div>
  );
}
