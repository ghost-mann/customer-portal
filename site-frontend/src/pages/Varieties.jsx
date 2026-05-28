import Icon from '../components/Icon';

const FALLBACK = [
  { name: 'Juliet',        category: 'Roses · Garden',  tagline: 'Cupped peach blooms, 50-70 stems per bunch.' },
  { name: 'Pink O\'Hara',  category: 'Roses · Garden',  tagline: 'Soft pink, classic vase life of 12-14 days.' },
  { name: 'Quicksand',     category: 'Roses · Standard',tagline: 'Champagne head, 50-90 cm stem lengths.' },
  { name: 'White O\'Hara', category: 'Roses · Garden',  tagline: 'Ivory cups for bridal work and event florists.' },
  { name: 'Mondial',       category: 'Roses · Standard',tagline: 'Large white head, the workhorse of winter weddings.' },
  { name: 'Avalanche',     category: 'Roses · Standard',tagline: 'Pure white, 70 cm baseline, year-round.' },
  { name: 'Hass premium',  category: 'Avocados',        tagline: 'Dry-matter ≥ 23%, harvested fortnightly.' },
  { name: 'Hass standard', category: 'Avocados',        tagline: 'EU GAP-compliant, 4–7 calibration.' },
  { name: 'AA arabica',    category: 'Coffee',          tagline: 'Specialty-grade single-origin from Nyeri.' },
];

export default function Varieties({ content, navigate }) {
  const c = content || {};
  const varieties = c.varieties?.items?.length ? c.varieties.items : FALLBACK;
  const groups = {};
  varieties.forEach((v) => {
    const cat = (v.category || 'Other').split('·')[0].trim();
    (groups[cat] = groups[cat] || []).push(v);
  });

  return (
    <>
      <section className="hero" style={{ padding: '64px 0 32px' }}>
        <div className="container-narrow" style={{ textAlign: 'center' }}>
          <div className="hero-eyebrow" style={{ justifyContent: 'center' }}>OUR CATALOGUE</div>
          <h1 className="hero-title" style={{ fontSize: 'clamp(36px, 4.5vw, 56px)' }}>
            What's in season <em>this week.</em>
          </h1>
          <p className="hero-subtitle" style={{ margin: '20px auto 0' }}>
            {c.varieties?.intro ||
              'A rotating selection of what our farms have ready to ship. For exact availability, volumes and current prices, sign in to the member portal or ask your account manager.'}
          </p>
        </div>
      </section>

      {Object.entries(groups).map(([cat, items]) => (
        <section className="section" style={{ paddingTop: 24, paddingBottom: 64 }} key={cat}>
          <div className="container">
            <div className="section-head" style={{ marginBottom: 24 }}>
              <div className="section-eyebrow">{cat.toUpperCase()}</div>
              <h2 className="section-title" style={{ fontSize: 28 }}>
                {items.length} variet{items.length === 1 ? 'y' : 'ies'} in {cat.toLowerCase()}
              </h2>
            </div>
            <div className="varieties-grid">
              {items.map((v, i) => (
                <div className="variety-card" key={i}>
                  <div className="variety-image">
                    {v.image
                      ? <img src={v.image} alt={v.name} />
                      : <div className="placeholder"><Icon name="local_florist" /></div>}
                  </div>
                  <div className="variety-body">
                    {v.category && <div className="variety-category">{v.category}</div>}
                    <div className="variety-name">{v.name}</div>
                    {v.tagline && <div className="variety-tagline">{v.tagline}</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      ))}

      <section className="section section-alt">
        <div className="container-narrow" style={{ textAlign: 'center' }}>
          <h2 className="section-title" style={{ margin: '0 auto 16px' }}>
            Want the <em>full weekly availability list?</em>
          </h2>
          <p className="section-intro" style={{ margin: '0 auto 28px' }}>
            Members see live stock, prices and lead-times. Get in touch and we'll set you up.
          </p>
          <a className="btn btn-primary" onClick={() => navigate('/contact')}>
            Request access<Icon name="arrow_forward" />
          </a>
        </div>
      </section>
    </>
  );
}
