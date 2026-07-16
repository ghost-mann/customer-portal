import { useEffect, useState } from 'react';
import { brand } from '../brand';
import { useRoute } from '../router';
import { useStore } from '../store';
import ProductCard from '../components/ProductCard';
import FilterRail from '../components/FilterRail';
import ToolsMenu from '../components/ToolsMenu';

const FULL_WIDTH_KEY = 'ws_full_width';

function readStoredFullWidth() {
  try { return localStorage.getItem(FULL_WIDTH_KEY) === '1'; } catch { return false; }
}

// Home › Shop [› <category>] — Home re-lands on the shop (there's no
// separate home route: router.pathToRoute maps both '/' and '/shop' to the
// 'shop' page), Shop itself is only a link while a category filter is
// active (clicking it clears that filter), and the active category — when
// present — is the trailing, non-interactive crumb.
function Breadcrumb({ category, onHomeClick, onShopClick }) {
  return (
    <nav className="ws-breadcrumb" aria-label="Breadcrumb">
      <button type="button" className="ws-breadcrumb-link" onClick={onHomeClick}>Home</button>
      <span className="ws-breadcrumb-sep" aria-hidden="true">›</span>
      {category ? (
        <button type="button" className="ws-breadcrumb-link" onClick={onShopClick}>Shop</button>
      ) : (
        <span className="ws-breadcrumb-current" aria-current="page">Shop</span>
      )}
      {category && (
        <>
          <span className="ws-breadcrumb-sep" aria-hidden="true">›</span>
          <span className="ws-breadcrumb-current" aria-current="page">{category}</span>
        </>
      )}
    </nav>
  );
}

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
  const category = useStore((s) => s.query.item_group);
  const setItemGroup = useStore((s) => s.setItemGroup);
  const clearFilters = useStore((s) => s.clearFilters);
  const { navigate } = useRoute();

  // Constrained (1200px, centered) vs full-width — a toolbar toggle for
  // shoppers who'd rather use the whole viewport on wide screens.
  // Persisted so the choice survives a reload; defaults to off (constrained).
  const [fullWidth, setFullWidth] = useState(readStoredFullWidth);
  useEffect(() => {
    try { localStorage.setItem(FULL_WIDTH_KEY, fullWidth ? '1' : '0'); } catch { /* storage unavailable */ }
  }, [fullWidth]);

  return (
    <div className={`ws-shop${fullWidth ? ' ws-shop-full' : ''}`}>
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

        <div className="ws-shop-toolbar">
          <Breadcrumb
            category={category}
            onHomeClick={() => { clearFilters(); navigate('/'); }}
            onShopClick={() => setItemGroup('')}
          />
          <div className="ws-toolbar-actions">
            <button
              type="button"
              className={`ws-icon-btn${fullWidth ? ' ws-icon-btn-active' : ''}`}
              aria-pressed={fullWidth}
              aria-label={fullWidth ? 'Switch to constrained width' : 'Switch to full width'}
              title={fullWidth ? 'Switch to constrained width' : 'Switch to full width'}
              onClick={() => setFullWidth((v) => !v)}
            >
              <span className="material-symbols-outlined" aria-hidden="true">
                {fullWidth ? 'fit_screen' : 'width_full'}
              </span>
            </button>
            <ToolsMenu onClearFilters={clearFilters} />
          </div>
        </div>

        <div className="ws-shop-layout">
          <div className="ws-filter-card">
            <FilterRail />
          </div>

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
