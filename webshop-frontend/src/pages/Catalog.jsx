import { useStore } from '../store';
import ItemCard from '../components/ItemCard';
import Icon from '../components/Icon';
import { fmt } from '../utils';

export default function Catalog() {
  const { items, loadingItems, itemsError, filters, setFilter } = useStore();

  if (itemsError) return <div className="alert alert-err"><Icon name="error" />{itemsError}</div>;
  if (loadingItems && !items) return <div className="loading">Loading catalogue</div>;

  const activeFilters = [];
  if (filters.category) activeFilters.push({ label: filters.category, clear: () => setFilter({ category: null }) });
  if (filters.farm)     activeFilters.push({ label: `Farm: ${filters.farm}`, clear: () => setFilter({ farm: null }) });
  if (filters.inSeason) activeFilters.push({ label: 'In season', clear: () => setFilter({ inSeason: false }) });
  if (filters.search)   activeFilters.push({ label: `"${filters.search}"`, clear: () => setFilter({ search: '' }) });

  return (
    <>
      {activeFilters.length > 0 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
          {activeFilters.map((f, i) => (
            <span
              key={i}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '5px 10px 5px 12px', borderRadius: 999,
                background: 'var(--accent-soft)', color: 'var(--accent-2)',
                fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 500,
                border: '1px solid #cfdbd1',
              }}
            >
              {f.label}
              <button
                onClick={f.clear}
                style={{ background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer', display: 'flex' }}
              ><Icon name="close" style={{ fontSize: 13 }} /></button>
            </span>
          ))}
        </div>
      )}

      {items && items.length === 0 ? (
        <div className="empty">
          <Icon name="search_off" />
          <div>No items match your filters.</div>
          <div style={{ marginTop: 8 }}>Try removing one to see more.</div>
        </div>
      ) : (
        <div className="grid-row">
          {(items || []).map((it) => <ItemCard key={it.name} item={it} />)}
        </div>
      )}
    </>
  );
}
