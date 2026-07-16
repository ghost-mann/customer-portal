import { brand } from '../brand';
import { useStore } from '../store';
import { useRoute } from '../router';
import ProductCard from '../components/ProductCard';

export default function Home() {
  const home = useStore((s) => s.home);
  const { navigate } = useRoute();
  if (!home) return null;
  const featured = home.featured?.length ? home.featured : home.new_arrivals;

  return (
    <div className="ws-home">
      <section className="ws-hero">
        <div className="ws-hero-inner">
          <div className="ws-hero-eyebrow">{brand.hero.eyebrow}</div>
          <h1 className="ws-hero-title">{brand.hero.title}</h1>
          <p className="ws-hero-sub">{brand.hero.subtitle}</p>
          <button className="ws-btn-gold" onClick={() => navigate('/shop')}>Shop the collection</button>
        </div>
      </section>

      {home.offers?.length > 0 && (
        <div className="ws-offers">
          {home.offers.map((o, i) => (
            <span key={i} className="ws-offer-chip">
              <strong>{o.offer_title}</strong>{o.offer_subtitle ? ` — ${o.offer_subtitle}` : ''}
            </span>
          ))}
        </div>
      )}

      <section className="ws-section">
        <div className="ws-section-hd"><h2>Featured</h2></div>
        <div className="ws-grid">
          {featured.map((p) => <ProductCard key={p.name} product={p} />)}
        </div>
      </section>

      {home.categories?.length > 0 && (
        <section className="ws-section">
          <div className="ws-section-hd"><h2>Shop by category</h2></div>
          <div className="ws-cats">
            {home.categories.map((c) => (
              <button key={c.item_group} className="ws-cat"
                onClick={() => navigate(`/shop?category=${encodeURIComponent(c.item_group)}`)}>
                <span className="ws-cat-name">{c.item_group}</span>
                <span className="ws-cat-count">{c.count}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {home.new_arrivals?.length > 0 && (
        <section className="ws-section">
          <div className="ws-section-hd"><h2>New arrivals</h2></div>
          <div className="ws-grid">
            {home.new_arrivals.map((p) => <ProductCard key={p.name} product={p} />)}
          </div>
        </section>
      )}
    </div>
  );
}
