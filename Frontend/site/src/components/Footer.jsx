import Icon from '@shared/Icon';

export default function Footer({ content, navigate }) {
  const c = content || {};
  const year = new Date().getFullYear();
  return (
    <footer className="foot">
      <div className="foot-inner">
        <div>
          <div className="foot-brand">
            <div className="brand-mark">KR</div>
            <span className="brand-text">{c.brand?.name || 'Karen Roses'}</span>
          </div>
          <p className="foot-tag">{c.brand?.tagline || 'Farm-direct, every season.'}</p>
        </div>
        <div className="foot-col">
          <h4>Explore</h4>
          <ul>
            <li><a onClick={() => navigate('/')}>Home</a></li>
            <li><a onClick={() => navigate('/about')}>About</a></li>
            <li><a onClick={() => navigate('/varieties')}>Varieties</a></li>
            <li><a onClick={() => navigate('/contact')}>Contact</a></li>
          </ul>
        </div>
        <div className="foot-col">
          <h4>Members</h4>
          <ul>
            <li><a href="/login?redirect-to=/customer-portal">Sign in</a></li>
            <li><a href="/customer-portal">Member portal</a></li>
            <li><a href="/website-shop">Webshop</a></li>
          </ul>
        </div>
        <div className="foot-col">
          <h4>Contact</h4>
          <ul>
            {c.contact?.email   && <li><a href={`mailto:${c.contact.email}`}>{c.contact.email}</a></li>}
            {c.contact?.phone   && <li><a href={`tel:${c.contact.phone}`}>{c.contact.phone}</a></li>}
            {c.contact?.address && <li style={{ whiteSpace: 'pre-line' }}>{c.contact.address}</li>}
          </ul>
        </div>
      </div>
      <div className="foot-meta">
        <span>© {year} · {c.footer?.text || 'Customer Portal · Upande Ltd'}</span>
        {c.footer?.show_powered_by !== 0 && <span>Powered by Customer Portal</span>}
      </div>
    </footer>
  );
}
