import { create } from 'zustand';
import { getProductFilterData } from './lib/api';

// The full, addressable query shape `get_product_filter_data` accepts
// (confirmed live via curl against upande_webshop.upande_webshop.api —
// see apps/upande_webshop/upande_webshop/upande_webshop/api.py):
//   { search, field_filters:{fieldname:value|[values]}, attribute_filters:{attr:value},
//     item_group, start, from_filters }
// NOTE: the endpoint's own `filters` response key only ever carries
// `discount_filters` (populated when the result set has discounted items) —
// upstream `webshop.webshop.api.get_product_filter_data` is byte-identical
// on this point. Field/attribute *value lists* (`ProductFiltersBuilder.
// get_field_filters/get_attribute_filters`) are computed server-side only
// for Jinja page context (www/webshop, item_group pages) and are not
// exposed by any whitelisted JSON method — so the filter rail below drives
// its facet *keys* off `settings.filter_fields`/`filter_attributes` (which
// fieldnames/attributes are configured as filterable) and free-types their
// values, while item_group gets first-class chip treatment since it both
// rides in the item payload and drives `sub_categories`.
const DEFAULT_QUERY = { search: '', field_filters: {}, attribute_filters: {}, item_group: '', start: 0 };

// Monotonic request token — `runQuery` calls can overlap (rapid filter/
// category changes) and resolve out of order. Each call captures the
// current value before its await; if a newer call has since bumped it,
// the stale response is dropped instead of clobbering fresher state.
let _reqSeq = 0;

// Reflect search/category into the URL (?q=&category=) so a shared link or
// back/forward reproduces the same shop view. Uses replaceState — filter
// changes are not distinct history entries.
function readInitialQuery() {
  if (typeof window === 'undefined') return {};
  const params = new URLSearchParams(window.location.search);
  const patch = {};
  if (params.get('q')) patch.search = params.get('q');
  if (params.get('category')) patch.item_group = params.get('category');
  return patch;
}

function syncUrl(query) {
  if (typeof window === 'undefined') return;
  const params = new URLSearchParams(window.location.search);
  query.search ? params.set('q', query.search) : params.delete('q');
  query.item_group ? params.set('category', query.item_group) : params.delete('category');
  const qs = params.toString();
  const url = window.location.pathname + (qs ? `?${qs}` : '');
  window.history.replaceState(window.history.state, '', url);
}

export const useStore = create((set, get) => ({
  // `settings` is the full Webshop Settings doc, embedded on every
  // get_product_filter_data response — no separate settings endpoint exists.
  settings: null,
  items: [],
  filters: {},
  subCategories: [],
  itemsCount: 0,
  loading: true,    // first paint only
  filtering: false, // subsequent grid reloads (search/filter/page changes)
  error: null,

  query: { ...DEFAULT_QUERY },

  // Item groups seen across every response so far this session — a
  // best-effort "browse by category" fallback for when `sub_categories`
  // is empty (e.g. no Item Group on this site has show_in_website=1, which
  // is the case on the live sandbox). Not a full catalogue, just what has
  // actually been rendered.
  categoryOptions: [],

  // UI open-state flags used by later phases (cart drawer, etc.)
  ui: { cartOpen: false },
  setUi: (patch) => set((s) => ({ ui: { ...s.ui, ...patch } })),

  bootstrap: () => get().runQuery(readInitialQuery(), { resetStart: false, first: true }),

  // Applies `patch` onto the current query and re-fetches. Any change other
  // than a plain page turn resets `start` to 0 and sends `from_filters:true`
  // (the backend does the same reset on its side — see api.py — this just
  // keeps client and server pagination state in agreement).
  runQuery: async (patch = {}, { resetStart = true, first = false } = {}) => {
    const query = { ...get().query, ...patch };
    if (resetStart) query.start = 0;
    set({ query, [first ? 'loading' : 'filtering']: true, error: null });
    // Capture the request token before the await — if a later `runQuery`
    // call bumps `_reqSeq` while this one is in flight, its response is
    // stale by the time it comes back and must not overwrite newer state.
    const token = ++_reqSeq;
    try {
      const data = await getProductFilterData({
        search: query.search || undefined,
        field_filters: query.field_filters,
        attribute_filters: query.attribute_filters,
        item_group: query.item_group || undefined,
        start: query.start,
        from_filters: resetStart,
      });
      if (token !== _reqSeq) return; // superseded by a newer request
      const items = data.items || [];
      syncUrl(query);
      set((s) => {
        const seen = new Set(s.categoryOptions);
        for (const item of items) if (item.item_group) seen.add(item.item_group);
        return {
          settings: data.settings || s.settings,
          items,
          filters: data.filters || {},
          subCategories: data.sub_categories || [],
          itemsCount: data.items_count || 0,
          categoryOptions: Array.from(seen).sort(),
          loading: false,
          filtering: false,
        };
      });
    } catch (e) {
      if (token !== _reqSeq) return; // superseded by a newer request
      set({ error: String(e), loading: false, filtering: false });
    }
  },

  setSearch: (term) => get().runQuery({ search: term }),

  setItemGroup: (itemGroup) => get().runQuery({ item_group: itemGroup }),

  setFieldFilter: (fieldname, value) => {
    const field_filters = { ...get().query.field_filters };
    if (value) field_filters[fieldname] = value;
    else delete field_filters[fieldname];
    get().runQuery({ field_filters });
  },

  setAttributeFilter: (attribute, value) => {
    const attribute_filters = { ...get().query.attribute_filters };
    if (value) attribute_filters[attribute] = value;
    else delete attribute_filters[attribute];
    get().runQuery({ attribute_filters });
  },

  clearFilters: () => get().runQuery({ ...DEFAULT_QUERY }),

  goToStart: (start) => get().runQuery({ start }, { resetStart: false }),
}));
