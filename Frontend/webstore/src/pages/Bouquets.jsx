import { useEffect, useMemo, useState } from 'react';
import { useRoute } from '../router';
import { useStore } from '../store';
import { getBouquetCatalogItems } from '../lib/api';
import BouquetComposer from '../components/BouquetComposer';

// `/upande-webstore/bouquets` — mirrors upande_webshop's own /bouquet
// listing (www/bouquet/index.py): one card per distinct `bouquet` value in
// Webshop Settings' `bouquet_recipes` table, gated on `show_bouquets_page`
// (confirmed by reading index.py's own redirect-to-/webshop guard). The
// recipe rows (item_group/stem_length/quantity) describe what's inside each
// bouquet; selecting a card opens BouquetComposer to show that breakdown and
// add the bouquet (a single Website Item/cart line) to cart.
export default function Bouquets() {
  const { navigate } = useRoute();
  const settings = useStore((s) => s.settings);
  const enabled = Boolean(settings && settings.show_bouquets_page);
  const recipes = (settings && settings.bouquet_recipes) || [];

  const bouquets = useMemo(() => {
    const byName = new Map();
    for (const row of recipes) {
      if (!row.bouquet) continue;
      if (!byName.has(row.bouquet)) byName.set(row.bouquet, []);
      byName.get(row.bouquet).push(row);
    }
    return Array.from(byName.entries()).map(([name, rows]) => ({
      name,
      rows,
      totalStems: rows.reduce((sum, r) => sum + (Number(r.quantity) || 0), 0),
      item: null, // filled in once getBouquetCatalogItems resolves
    }));
  }, [recipes]);

  const [items, setItems] = useState({}); // { [Website Item name]: item }
  const [itemsLoading, setItemsLoading] = useState(false);
  const [itemsError, setItemsError] = useState(null);
  const [selected, setSelected] = useState(null); // bouquet name

  useEffect(() => {
    setSelected(null);
    if (!enabled || bouquets.length === 0) { setItems({}); return; }
    let cancelled = false;
    setItemsLoading(true);
    setItemsError(null);
    getBouquetCatalogItems(bouquets.map((b) => b.name), settings && settings.bouquets_item_group)
      .then((rows) => {
        if (cancelled) return;
        const map = {};
        for (const it of rows) map[it.name] = it;
        setItems(map);
      })
      .catch((e) => { if (!cancelled) setItemsError(String(e)); })
      .finally(() => { if (!cancelled) setItemsLoading(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, bouquets.map((b) => b.name).join('|')]);

  if (!enabled) {
    return (
      <div className="ws-shop ws-cart-page">
        <div className="ws-empty">
          <h1 className="ws-pd-title">Bouquets unavailable</h1>
          <p>Curated bouquets aren't enabled on this store right now.</p>
          <button className="ws-btn-gold" onClick={() => navigate('/shop')}>Back to Shop</button>
        </div>
      </div>
    );
  }

  if (bouquets.length === 0) {
    return (
      <div className="ws-shop ws-cart-page">
        <div className="ws-section-hd"><h1>Bouquets</h1></div>
        <div className="ws-empty">No bouquets have been defined yet.</div>
      </div>
    );
  }

  const selectedBouquet = selected
    ? { ...bouquets.find((b) => b.name === selected), item: items[selected] || null }
    : null;

  return (
    <div className="ws-shop ws-cart-page">
      <div className="ws-section-hd">
        <h1>Bouquets</h1>
        <span className="ws-section-count">{bouquets.length} bouquet{bouquets.length === 1 ? '' : 's'}</span>
      </div>

      {itemsError && <div className="ws-pd-add-result ws-pd-add-result-err" role="alert">{itemsError}</div>}

      {selectedBouquet ? (
        <div className="ws-bouquet-detail">
          <button className="ws-rail-clear" onClick={() => setSelected(null)}>&larr; Back to all bouquets</button>
          <BouquetComposer
            bouquet={selectedBouquet}
            onViewDetails={(route) => navigate(`/p/${route}`)}
          />
        </div>
      ) : (
        <div className={`ws-grid ws-bouquet-grid${itemsLoading ? ' ws-grid-loading' : ''}`}>
          {bouquets.map((b) => {
            const item = items[b.name];
            return (
              <button className="ws-card" key={b.name} onClick={() => setSelected(b.name)}>
                <div className="ws-card-img">
                  {item && item.website_image
                    ? <img src={item.website_image} alt={item.web_item_name || b.name} loading="lazy" />
                    : <span aria-hidden="true" className="material-symbols-outlined ws-card-ph">local_florist</span>}
                </div>
                <div className="ws-card-body">
                  <div className="ws-card-name">{(item && item.web_item_name) || b.name}</div>
                  <div className="ws-card-group">
                    {b.rows.length} ingredient{b.rows.length === 1 ? '' : 's'} · {b.totalStems} stem{b.totalStems === 1 ? '' : 's'}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
