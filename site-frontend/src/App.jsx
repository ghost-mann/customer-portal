import { useEffect, useState } from 'react';
import Nav from './components/Nav';
import Footer from './components/Footer';
import { useRoute } from './router';
import { apiGet } from './api';

import Home from './pages/Home';
import About from './pages/About';
import Varieties from './pages/Varieties';
import Contact from './pages/Contact';

const PAGES = { home: Home, about: About, varieties: Varieties, contact: Contact };

export default function App() {
  const { page, navigate } = useRoute();
  const [content, setContent] = useState(null);
  const [loadErr, setLoadErr] = useState(null);
  const [user, setUser] = useState(null); // {user, full_name} when logged in

  useEffect(() => {
    (async () => {
      try {
        const c = await apiGet('agriflow.api.site.get_site_content');
        setContent(c);
      } catch (e) {
        setContent({});
        setLoadErr(e.message);
      }
    })();

    // Detect logged-in state from cookie (Frappe sets user_id=Administrator/etc.)
    try {
      const cookies = Object.fromEntries(document.cookie.split(';').map((c) => {
        const i = c.indexOf('='); return [c.slice(0, i).trim(), decodeURIComponent(c.slice(i+1).trim())];
      }));
      if (cookies['user_id'] && cookies['user_id'] !== 'Guest') {
        setUser({ user: cookies['user_id'], full_name: cookies['full_name'] || cookies['user_id'] });
      }
    } catch (e) {}
  }, []);

  if (!content) {
    return (
      <>
        <Nav page={page} navigate={navigate} brand={{ name: 'agriflow' }} isLoggedIn={!!user} />
        <div className="loading" style={{ paddingTop: 120 }}>Loading</div>
      </>
    );
  }

  const Page = PAGES[page] || Home;

  return (
    <>
      <Nav page={page} navigate={navigate} brand={content.brand} isLoggedIn={!!user} />
      <main>
        <Page content={content} navigate={navigate} isLoggedIn={!!user} />
      </main>
      <Footer content={content} navigate={navigate} />
    </>
  );
}
