import { useEffect, useState } from 'react';

const BASE = '/upande-webstore';

// Returns { page, params }. The product route carries the Website Item
// `route` field, which may itself contain slashes (e.g.
// "webstore-demo-flowers/red-naomi-rose-qizt2") — capture everything after
// `/p/` verbatim, not just one segment.
export function pathToRoute(pathname) {
  const rest = pathname.startsWith(BASE) ? pathname.slice(BASE.length) : pathname;
  const clean = rest.replace(/\/+$/, '');
  if (clean === '' || clean === '/' || clean === '/shop') return { page: 'shop', params: {} };
  const seg = clean.split('/').filter(Boolean);
  if (seg[0] === 'p') return { page: 'product', params: { route: decodeURIComponent(seg.slice(1).join('/')) } };
  if (seg[0] === 'cart') return { page: 'cart', params: {} };
  if (seg[0] === 'wishlist') return { page: 'wishlist', params: {} };
  if (seg[0] === 'bouquets') return { page: 'bouquets', params: {} };
  if (seg[0] === 'orders') return { page: 'confirmation', params: { name: seg[1] } };
  return { page: 'shop', params: {} };
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
