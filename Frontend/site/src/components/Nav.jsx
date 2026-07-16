import { useEffect, useState } from 'react';
import Icon from '@shared/Icon';
import Logo from '@shared/Logo';

const LINKS = [
  { key: 'home',      label: 'Home',      path: '/' },
  { key: 'about',     label: 'About',     path: '/about' },
  { key: 'varieties', label: 'Varieties', path: '/varieties' },
  { key: 'contact',   label: 'Contact',   path: '/contact' },
];

export default function Nav({ page, navigate, brand, isLoggedIn }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function onScroll() { setScrolled(window.scrollY > 8); }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  function go(path) { setOpen(false); navigate(path); }

  return (
    <nav className={`nav${scrolled ? ' scrolled' : ''}`}>
      <div className="nav-row">
        <a className="brand" href="/" onClick={(e) => { e.preventDefault(); go('/'); }}>
          <div className="brand-mark"><Logo /></div>
          <span className="brand-text">{brand?.name || 'Upande'}</span>
        </a>
        <div className={`nav-links${open ? ' open' : ''}`}>
          {LINKS.map((l) => (
            <a key={l.key} className={`nav-link${page === l.key ? ' active' : ''}`}
               href={l.path}
               onClick={(e) => { e.preventDefault(); go(l.path); }}>
              {l.label}
            </a>
          ))}
          <a className="nav-cta" href={isLoggedIn ? '/customer-portal' : '/login?redirect-to=/customer-portal'}>
            <Icon name={isLoggedIn ? 'person' : 'login'} />
            {isLoggedIn ? 'My portal' : 'Member login'}
          </a>
        </div>
        <button className="mobile-toggle" onClick={() => setOpen((v) => !v)}>
          <Icon name={open ? 'close' : 'menu'} />
        </button>
      </div>
    </nav>
  );
}
