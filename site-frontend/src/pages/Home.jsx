import HeroImage from '../components/HeroImage';
import Icon from '../components/Icon';

// Built-in fallback value props if the doctype is empty
const FALLBACK_PROPS = [
  { icon: 'agriculture',  title: 'Cut to order',           body: 'Nothing sits in storage. Every consignment is picked, sleeved and packed the day it ships.' },
  { icon: 'flight_takeoff', title: 'On the next flight',   body: 'Same-day cold-chain transfer to Nairobi, Mombasa and onward to your destination airport.' },
  { icon: 'verified',     title: 'Inspected by hand',      body: 'Every box passes QC at the cold room — and again at the airport — before it leaves the farm.' },
];

const FALLBACK_VARIETIES = [
  { name: 'Garden roses',  category: 'Roses',     tagline: 'Cut at the perfect stage — Juliet, Pink O\'Hara, Quicksand.' },
  { name: 'Hass avocados', category: 'Avocados',  tagline: 'Premium-grade dry-matter, harvested fortnightly.' },
  { name: 'AA arabica',    category: 'Coffee',    tagline: 'Specialty-grade beans from highland micro-lots.' },
];

const FALLBACK_GALLERY = [null, null, null, null, null, null];

export default function Home({ content, navigate, isLoggedIn }) {
  const c = content || {};
  const hero = c.hero || {};
  const about = c.about || {};
  const propsItems = c.value_props?.length ? c.value_props : FALLBACK_PROPS;
  const stats = c.stats?.length ? c.stats : [
    { label: 'Farms', value: '7' },
    { label: 'Hectares', value: '420' },
    { label: 'Stems per week', value: '1.4M' },
    { label: 'On-time rate', value: '98%' },
  ];
  const varieties = c.varieties?.items?.length ? c.varieties.items : FALLBACK_VARIETIES;
  const gallery = c.gallery?.length ? c.gallery : FALLBACK_GALLERY;

  return (
    <>
      <section className="hero">
        <div className="hero-inner">
          <div>
            <div className="hero-eyebrow">{hero.eyebrow || 'FROM OUR FARMS'}</div>
            <h1 className="hero-title">
              Fresh from the field, <em>straight to you.</em>
            </h1>
            <p className="hero-subtitle">{hero.subtitle}</p>
            <div className="hero-actions">
              <a className="btn btn-primary" onClick={() => navigate(hero.cta_link || '/varieties')}>
                {hero.cta_label || 'See our catalogue'}<Icon name="arrow_forward" />
              </a>
              <a className="btn btn-ghost" href={isLoggedIn ? '/portal' : '/login?redirect-to=/portal'}>
                <Icon name="login" />Member login
              </a>
            </div>
          </div>
          <HeroImage src={hero.image} fallbackIcon="local_florist" meta="In season" />
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-head">
            <div className="section-eyebrow">WHAT MAKES US DIFFERENT</div>
            <h2 className="section-title">
              The shortest line possible <em>between farm and you.</em>
            </h2>
          </div>
          <div className="props-grid">
            {propsItems.slice(0, 3).map((p, i) => (
              <div className="prop" key={i}>
                <div className="prop-icon"><Icon name={p.icon || 'spa'} /></div>
                <div className="prop-title">{p.title}</div>
                <div className="prop-body">{p.body}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section section-alt">
        <div className="container">
          <div className="split">
            <div className="split-image">
              {about.image
                ? <img src={about.image} alt="" />
                : <div style={{ width:'100%', height:'100%', background:'linear-gradient(135deg, #d8d3c2, #adb4ab)' }} />}
            </div>
            <div className="split-content">
              <div className="section-eyebrow">{about.eyebrow || 'OUR STORY'}</div>
              <h2 className="section-title">{about.title || 'Generations of know-how.'}</h2>
              <div dangerouslySetInnerHTML={{ __html: about.body || '' }} />
              <div style={{ marginTop: 22 }}>
                <a className="btn-text" onClick={() => navigate('/about')}>Read more →</a>
              </div>
              {stats.length > 0 && (
                <div className="stats-row">
                  {stats.slice(0, 4).map((s, i) => (
                    <div key={i}>
                      <div className="stat-val">{s.value}</div>
                      <div className="stat-label">{s.label}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-head">
            <div className="section-eyebrow">IN SEASON</div>
            <h2 className="section-title">A few of <em>our favourites</em> right now.</h2>
            {c.varieties?.intro && <p className="section-intro">{c.varieties.intro}</p>}
          </div>
          <div className="varieties-grid">
            {varieties.slice(0, 6).map((v, i) => (
              <div className="variety-card" key={i} onClick={() => navigate('/varieties')}>
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
          <div style={{ marginTop: 36, textAlign: 'center' }}>
            <a className="btn btn-ghost" onClick={() => navigate('/varieties')}>
              View full catalogue<Icon name="arrow_forward" />
            </a>
          </div>
        </div>
      </section>

      <section className="section section-alt">
        <div className="container">
          <div className="section-head">
            <div className="section-eyebrow">ON THE FARM</div>
            <h2 className="section-title">From <em>our cold rooms</em> to your front door.</h2>
          </div>
          <div className="gallery-grid">
            {gallery.slice(0, 6).map((g, i) => (
              <div className="gallery-cell" key={i}>
                {g?.image
                  ? <img src={g.image} alt={g.alt || ''} />
                  : <div className="placeholder" />}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container-narrow" style={{ textAlign: 'center' }}>
          <div className="section-eyebrow">READY TO TALK?</div>
          <h2 className="section-title" style={{ margin: '0 auto 16px' }}>
            We'd love to hear <em>about your week.</em>
          </h2>
          <p className="section-intro" style={{ margin: '0 auto 28px' }}>
            Tell us what you need and we'll get back to you within 24 hours with what we have available this week.
          </p>
          <a className="btn btn-primary" onClick={() => navigate('/contact')}>
            Get in touch<Icon name="arrow_forward" />
          </a>
        </div>
      </section>
    </>
  );
}
