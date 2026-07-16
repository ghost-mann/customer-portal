import { useEffect, useState } from 'react';

const BASE = '/upande-webstore';

// Returns { page, params }. Product route carries the website-item name.
export function pathToRoute(pathname) {
  const rest = pathname.startsWith(BASE) ? pathname.slice(BASE.length) : pathname;
  const clean = rest.replace(/\/+$/, '');
  if (clean === '' || clean === '/') return { page: 'home', params: {} };
  const seg = clean.split('/').filter(Boolean);
  if (seg[0] === 'shop') return { page: 'shop', params: {} };
  if (seg[0] === 'product') return { page: 'product', params: { name: decodeURIComponent(seg.slice(1).join('/')) } };
  if (seg[0] === 'cart') return { page: 'cart', params: {} };
  if (seg[0] === 'wishlist') return { page: 'wishlist', params: {} };
  if (seg[0] === 'bouquets') return { page: 'bouquets', params: {} };
  if (seg[0] === 'checkout') return { page: 'checkout', params: {} };
  if (seg[0] === 'order') return { page: 'confirmation', params: { name: seg[1] } };
  return { page: 'home', params: {} };
}

export function useRoute() {
  const [route, setRoute] = useState(pathToRoute(window.location.pathname));
  useEffect(() => {
    const onPop = () => setRoute(pathToRoute(window.location.pathname));
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);
  function navigate(path) {
    const full = path.startsWith(BASE) ? path : `${BASE}${path.startsWith('/') ? '' : '/'}${path}`;
    if (full === window.location.pathname) return;
    window.history.pushState({}, '', full);
    window.dispatchEvent(new PopStateEvent('popstate'));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  return { ...route, navigate };
}
