import { create } from 'zustand';
import { getProductFilterData, getCart } from './lib/api';

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

// Cheap (no-request) initial read of the `wish_count` cookie upande_webshop's
// wishlist doctype sets on every add/remove — see the `wishlistCount` field
// below for the full rationale. Returns null (unknown) when the cookie has
// never been set, e.g. a guest or a user who has never touched the wishlist.
function readWishCountCookie() {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/(?:^|; )wish_count=(\d+)/);
  return match ? Number(match[1]) : null;
}

// Same idea for the cart badge: upande_webshop's set_cart_count() (shopping_
// cart/cart.py) sets a plain `cart_count` cookie (str(cint(total_qty))) on
// every cart mutation and on login (hooks.py's on_session_creation ->
// shopping_cart.utils.set_cart_count), and clears it on logout/empty cart —
// confirmed by grep, same cookie_manager.set_cookie(name, str(count)) shape
// as wish_count above. Reading it on boot means the Nav badge is correct on
// first paint instead of sitting at 0 until the shopper visits /cart.
function readCartCountCookie() {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/(?:^|; )cart_count=(\d+)/);
  return match ? Number(match[1]) : null;
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

  // Cart badge count. update_cart's response includes cart_count directly
  // (server comment: more reliable than depending on cookie-set timing), so
  // Product.jsx's add-to-cart just forwards it here. Guests never populate
  // this — their add-to-cart stashes + redirects to login instead.
  cartCount: readCartCountCookie() || 0,
  setCartCount: (n) => set({ cartCount: Number(n) || 0 }),

  // Wishlist badge count (Nav, RT7). There is no whitelisted "count my
  // wishlist" method (see getWishlistItems's comment in lib/api.js for why a
  // full list isn't cheap either — it pages the whole catalogue), but
  // add_to_wishlist/remove_from_wishlist both already return `wish_count`
  // AND set it as a plain `wish_count` cookie server-side
  // (doctype/wishlist/wishlist.py's _set_wish_count_cookie — the same cookie
  // upande_webshop's own vanilla-JS theme reads in public/js/wishlist.js).
  // Reading that cookie on boot is free (no request) and gives a same-session-
  // or-earlier count immediately; WishlistButton then keeps it live by
  // forwarding each toggle's `wish_count`. Guests never have a meaningful
  // count here — Nav only renders the badge for a logged-in session.
  wishlistCount: readWishCountCookie(),
  setWishlistCount: (n) => set({ wishlistCount: Number(n) || 0 }),

  // RT4 cart slice. `cart` is the raw get_cart_quotation() response
  // ({ doc, shipping_addresses, billing_addresses, shipping_rules, cart_settings }).
  // NOT allow_guest (confirmed by grep) — only ever called from Cart.jsx after
  // its own window.logged_in guard, never for a guest session.
  cart: null,
  cartLoading: false,
  cartError: null,

  loadCart: async () => {
    set({ cartLoading: true, cartError: null });
    try {
      const data = await getCart();
      const totalQty = data && data.doc && data.doc.total_qty;
      set({
        cart: data,
        cartLoading: false,
        ...(totalQty != null ? { cartCount: Number(totalQty) || 0 } : {}),
      });
      return data;
    } catch (e) {
      set({ cartError: String(e), cartLoading: false });
      return null;
    }
  },

  clearCart: () => set({ cart: null, cartError: null }),

  // RT6 order confirmation. Cart.jsx snapshots the cart doc (items/totals/
  // currency) right before navigating to /orders/<name> on a successful
  // checkout — there is no whitelisted method to re-fetch a placed order's
  // contents (see lib/api.js getOrderDoc's comment), so this in-memory
  // snapshot is the primary source for Order.jsx's confirmation view. Only
  // valid for the single navigation that follows checkout in the same
  // session (a reload or direct link loses it — Order.jsx falls back to
  // getOrderDoc, then a minimal confirmation).
  lastOrder: null,
  setLastOrder: (order) => set({ lastOrder: order }),

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

  // Optimistic wishlist reconciliation (RT5): WishlistButton calls this right
  // after a toggle so any card for the same item_code already on-screen (Shop
  // grid) reflects the new state without a full re-fetch. Product.jsx keeps
  // its own local `product` state and does not read this — it only affects
  // `items` in the shared store.
  setItemWished: (itemCode, wished) => set((s) => ({
    items: s.items.map((it) => (it.item_code === itemCode ? { ...it, wished } : it)),
  })),

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
