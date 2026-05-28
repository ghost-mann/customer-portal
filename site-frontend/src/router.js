// Tiny client-side router driven by window.location.pathname. Frappe
// website_route_rules in hooks.py forwards /about, /varieties, /contact to
// the same home.html template, so the React app reads pathname to choose page.

import { useEffect, useState } from 'react';

const PATH_TO_PAGE = {
  '/': 'home',
  '/home': 'home',
  '/about': 'about',
  '/varieties': 'varieties',
  '/contact': 'contact',
};

export function pathToPage(p) {
  return PATH_TO_PAGE[p] || 'home';
}

export function useRoute() {
  const [page, setPage] = useState(pathToPage(window.location.pathname));

  useEffect(() => {
    function onPop() { setPage(pathToPage(window.location.pathname)); }
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  function navigate(path) {
    if (path === window.location.pathname) return;
    window.history.pushState({}, '', path);
    setPage(pathToPage(path));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return { page, navigate };
}
