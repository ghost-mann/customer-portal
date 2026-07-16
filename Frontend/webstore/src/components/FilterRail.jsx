import { useEffect, useState } from 'react';
import { useStore } from '../store';

const SEARCH_DEBOUNCE_MS = 350;

// Debounced free-text filter used for both field and attribute filters —
// `get_product_filter_data` matches these server-side (exact/`in` for field
// filters, exact for attribute filters); there's no whitelisted endpoint
// that returns a value list to pick from (see store.js note), so these are
// typed, not selected.
function TextFilter({ label, value, onChange }) {
  const [draft, setDraft] = useState(value || '');
  useEffect(() => setDraft(value || ''), [value]);
  useEffect(() => {
    const t = setTimeout(() => {
      if (draft !== (value || '')) onChange(draft.trim());
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft]);
  return (
    <label className="ws-rail-field">
      <span className="ws-rail-field-label">{label}</span>
      <input
        type="text"
        value={draft}
        placeholder={`Any ${label.toLowerCase()}`}
        onChange={(e) => setDraft(e.target.value)}
      />
    </label>
  );
}

export default function FilterRail() {
  const settings = useStore((s) => s.settings);
  const query = useStore((s) => s.query);
  const subCategories = useStore((s) => s.subCategories);
  const categoryOptions = useStore((s) => s.categoryOptions);
  const setSearch = useStore((s) => s.setSearch);
  const setItemGroup = useStore((s) => s.setItemGroup);
  const setFieldFilter = useStore((s) => s.setFieldFilter);
  const setAttributeFilter = useStore((s) => s.setAttributeFilter);
  const clearFilters = useStore((s) => s.clearFilters);

  const [searchDraft, setSearchDraft] = useState(query.search || '');
  useEffect(() => setSearchDraft(query.search || ''), [query.search]);
  useEffect(() => {
    const t = setTimeout(() => {
      if (searchDraft !== (query.search || '')) setSearch(searchDraft.trim());
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchDraft]);

  if (!settings) return null;

  // Category chips: prefer the live drill-down list (`sub_categories`,
  // populated once `item_group` is set) and fall back to item groups seen
  // in the grid so far — the site has no Item Group with
  // show_in_website=1, so `sub_categories` is empty at the top level here.
  const chips = subCategories.length
    ? subCategories.map((g) => ({ name: g.name, route: g.route }))
    : categoryOptions.map((name) => ({ name }));

  // Field filters other than item_group (which has its own chip UI above) —
  // whatever `Webshop Settings.filter_fields` configures.
  const fieldRows = (settings.filter_fields || []).filter((r) => r.fieldname !== 'item_group');
  const attributeRows = settings.filter_attributes || [];

  const hasActiveFilters =
    Boolean(query.search) ||
    Boolean(query.item_group) ||
    Object.keys(query.field_filters || {}).length > 0 ||
    Object.keys(query.attribute_filters || {}).length > 0;

  return (
    <aside className="ws-rail">
      <div className="ws-rail-block">
        <span className="ws-rail-title">Search</span>
        <input
          type="text"
          className="ws-search"
          value={searchDraft}
          placeholder="Search flowers…"
          onChange={(e) => setSearchDraft(e.target.value)}
          aria-label="Search products"
        />
      </div>

      {chips.length > 0 && (
        <div className="ws-rail-block">
          <span className="ws-rail-title">Category</span>
          <div className="ws-chips">
            <button
              className={`ws-chip${!query.item_group ? ' ws-chip-active' : ''}`}
              onClick={() => setItemGroup('')}
            >
              All
            </button>
            {chips.map((c) => (
              <button
                key={c.name}
                className={`ws-chip${query.item_group === c.name ? ' ws-chip-active' : ''}`}
                onClick={() => setItemGroup(c.name)}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {Boolean(settings.enable_field_filters) && fieldRows.length > 0 && (
        <div className="ws-rail-block">
          <span className="ws-rail-title">Filters</span>
          {fieldRows.map((row) => (
            <TextFilter
              key={row.fieldname}
              label={row.fieldname.replace(/_/g, ' ')}
              value={query.field_filters[row.fieldname]}
              onChange={(v) => setFieldFilter(row.fieldname, v)}
            />
          ))}
        </div>
      )}

      {Boolean(settings.enable_attribute_filters) && attributeRows.length > 0 && (
        <div className="ws-rail-block">
          <span className="ws-rail-title">Attributes</span>
          {attributeRows.map((row) => (
            <TextFilter
              key={row.attribute}
              label={row.attribute}
              value={query.attribute_filters[row.attribute]}
              onChange={(v) => setAttributeFilter(row.attribute, v)}
            />
          ))}
        </div>
      )}

      {hasActiveFilters && (
        <button className="ws-rail-clear" onClick={clearFilters}>
          Clear all filters
        </button>
      )}
    </aside>
  );
}
