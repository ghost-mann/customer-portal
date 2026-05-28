import HeroImage from '../components/HeroImage';
import Icon from '../components/Icon';

export default function About({ content, navigate }) {
  const c = content || {};
  const about = c.about || {};
  const stats = c.stats?.length ? c.stats : [
    { label: 'Farms', value: '7' },
    { label: 'Hectares', value: '420' },
    { label: 'Hands on the team', value: '2,800' },
    { label: 'Years on the land', value: '40+' },
  ];

  return (
    <>
      <section className="hero">
        <div className="hero-inner">
          <div>
            <div className="hero-eyebrow">ABOUT US</div>
            <h1 className="hero-title">
              {about.title?.split(' ').slice(0, -1).join(' ')}{' '}
              <em>{about.title?.split(' ').slice(-1)[0] || 'know-how.'}</em>
            </h1>
            <div className="hero-subtitle" dangerouslySetInnerHTML={{
              __html: about.body || `
                <p>Our farms are run by people who grew up on them. Every variety we ship is chosen for how it travels, not just how it grows — and every consignment is checked by hand before it leaves the cold room.</p>
                <p>What started as a single rose farm in the Kenyan highlands is today a network of family-run operations across roses, avocados and specialty coffee, all sharing the same standards.</p>
              `}} />
            <div style={{ marginTop: 18 }}>
              <a className="btn btn-primary" onClick={() => navigate('/contact')}>
                Get in touch<Icon name="arrow_forward" />
              </a>
            </div>
          </div>
          <HeroImage src={about.image} fallbackIcon="agriculture" meta="Naivasha, Kenya" />
        </div>
      </section>

      <section className="section section-alt">
        <div className="container">
          <div className="section-head">
            <div className="section-eyebrow">BY THE NUMBERS</div>
            <h2 className="section-title">Some <em>shape</em> to what we do.</h2>
          </div>
          <div className="stats-row" style={{ marginTop: 0, paddingTop: 0, border: 'none', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 36 }}>
            {stats.map((s, i) => (
              <div key={i}>
                <div className="stat-val" style={{ fontSize: 52 }}>{s.value}</div>
                <div className="stat-label">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="props-grid">
            <div className="prop">
              <div className="prop-icon"><Icon name="psychology" /></div>
              <div className="prop-title">Our standard</div>
              <div className="prop-body">
                Every stem, every fruit, every bean has to clear a bar set by people who'd rather lose a shipment than ship something they're not proud of.
              </div>
            </div>
            <div className="prop">
              <div className="prop-icon"><Icon name="eco" /></div>
              <div className="prop-title">Our footprint</div>
              <div className="prop-body">
                Drip irrigation, integrated pest management, full-loop water recycling and on-farm composting. We've measured it for two decades and we're proud of where we are.
              </div>
            </div>
            <div className="prop">
              <div className="prop-icon"><Icon name="handshake" /></div>
              <div className="prop-title">Our people</div>
              <div className="prop-body">
                Permanent contracts, on-farm housing, school fees, healthcare on-site. The team that grows the flowers stays the team that grows the flowers.
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
