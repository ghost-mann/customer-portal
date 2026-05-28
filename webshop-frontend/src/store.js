import { create } from 'zustand';
import { api } from './api';

const IMPER_KEY = 'agriflow_shop_impersonate';
function loadImpersonate() {
  try { return sessionStorage.getItem(IMPER_KEY) || null; } catch (e) { return null; }
}
function saveImpersonate(v) {
  try {
    if (v) sessionStorage.setItem(IMPER_KEY, v);
    else sessionStorage.removeItem(IMPER_KEY);
  } catch (e) {}
}

export const useStore = create((set, get) => ({
  // Auth + context
  ctx: null,           // {user, full_name, customer, customer_name, is_staff}
  loadingCtx: true,
  ctxError: null,

  // Staff-only impersonation
  impersonate: loadImpersonate(),

  // Toast notification
  toast: null,         // {message, kind: 'info'|'err'|'ok'}

  // Catalog
  categories: null,    // [{item_group, cnt}]
  farms: null,         // [farm_name, ...]
  items: null,         // [{name, item_code, web_item_name, ...price/tags}]
  loadingItems: false,
  itemsError: null,

  // Filters
  filters: { category: null, search: '', farm: null, inSeason: false },

  // Cart
  cart: null,          // {name, currency, items[], total_qty, total, item_count}
  loadingCart: false,
  cartError: null,

  // UI
  detail: null,        // {item, loading, err}
  cartOpen: false,
  view: 'catalog',     // catalog | confirmation
  confirmation: null,  // {name, status}

  // ── Actions ──────────────────────────────────────────────
  setView(v) { set({ view: v }); },
  openCart() { set({ cartOpen: true }); get().loadCart(); },
  closeCart() { set({ cartOpen: false }); },

  setToast(t) { set({ toast: t }); if (t) setTimeout(() => set({ toast: null }), 4500); },
  clearToast() { set({ toast: null }); },

  _args(extra = {}) {
    const im = get().impersonate;
    const base = im ? { customer: im } : {};
    return { ...base, ...extra };
  },

  async setImpersonate(name) {
    saveImpersonate(name || null);
    set({
      impersonate: name || null,
      items: null, cart: null, categories: null, farms: null,
    });
    await get().bootstrap();
  },

  setFilter(patch) {
    set({ filters: { ...get().filters, ...patch } });
    get().loadItems();
  },

  async bootstrap() {
    set({ loadingCtx: true, ctxError: null });
    try {
      const ctx = await api('agriflow.api.customer.get_my_context', get()._args());
      set({ ctx, loadingCtx: false });
      // Eager-load shop data
      get().loadCategories();
      get().loadFarms();
      get().loadItems();
      get().loadCart();
    } catch (e) {
      set({ loadingCtx: false, ctxError: e.message });
    }
  },

  async loadCategories() {
    try {
      const r = await api('agriflow.api.webshop.list_categories', get()._args());
      set({ categories: r || [] });
    } catch (e) { set({ categories: [] }); }
  },

  async loadFarms() {
    try {
      const r = await api('agriflow.api.webshop.list_farms', get()._args());
      set({ farms: r || [] });
    } catch (e) { set({ farms: [] }); }
  },

  async loadItems() {
    set({ loadingItems: true, itemsError: null });
    const f = get().filters;
    try {
      const r = await api('agriflow.api.webshop.list_items', get()._args({
        category:  f.category,
        search:    f.search,
        farm:      f.farm,
        in_season: f.inSeason ? 1 : 0,
        limit: 120,
      }));
      set({ items: r || [], loadingItems: false });
    } catch (e) {
      set({ items: [], loadingItems: false, itemsError: e.message });
    }
  },

  async loadDetail(name) {
    set({ detail: { item: null, loading: true, err: null } });
    try {
      const item = await api('agriflow.api.webshop.get_item', get()._args({ name }));
      set({ detail: { item, loading: false, err: null } });
    } catch (e) {
      set({ detail: { item: null, loading: false, err: e.message } });
    }
  },
  closeDetail() { set({ detail: null }); },

  async loadCart() {
    set({ loadingCart: true, cartError: null });
    try {
      const cart = await api('agriflow.api.webshop.get_cart', get()._args());
      set({ cart, loadingCart: false });
    } catch (e) {
      set({ loadingCart: false, cartError: e.message });
    }
  },

  // Pre-check before any cart-mutating call. Staff with no impersonate get a
  // friendly toast instead of a 403.
  _requireCustomer() {
    const { ctx, impersonate } = get();
    const hasCustomer = !!ctx?.customer || !!impersonate;
    if (!hasCustomer) {
      get().setToast({
        kind: 'err',
        message: ctx?.is_staff
          ? 'Pick a customer first — click "Viewing as: …" in the top right.'
          : 'No customer account linked. Please contact your account manager.',
      });
      return false;
    }
    return true;
  },

  async addToCart(item_code, qty = 1) {
    if (!get()._requireCustomer()) return null;
    try {
      const cart = await api('agriflow.api.webshop.add_to_cart', get()._args({ item_code, qty }));
      set({ cart });
      get().setToast({ kind: 'ok', message: 'Added to cart' });
      return cart;
    } catch (e) {
      get().setToast({ kind: 'err', message: e.message });
      throw e;
    }
  },

  // Pending qty per item (in-flight serialization)
  _qtyChain: Promise.resolve(),
  _qtyTimers: {},

  async updateQty(item_code, qty) {
    if (!get()._requireCustomer()) return;
    // Optimistic UI: bump the qty in the local cart immediately so the +/-
    // button feels instant. Server save is queued/debounced.
    const cart = get().cart;
    if (cart?.items) {
      const items = cart.items.map((r) => r.item_code === item_code ? { ...r, qty } : r).filter((r) => r.qty > 0);
      set({ cart: { ...cart, items, total_qty: items.reduce((a, r) => a + r.qty, 0), item_count: items.length } });
    }
    // Debounce per item — coalesce rapid clicks within 280ms
    clearTimeout(get()._qtyTimers[item_code]);
    const t = setTimeout(() => {
      get()._qtyTimers[item_code] = null;
      // Chain through a single promise to serialize backend writes
      const next = get()._qtyChain.then(async () => {
        try {
          const fresh = await api('agriflow.api.webshop.update_qty', get()._args({ item_code, qty }));
          set({ cart: fresh });
        } catch (e) {
          get().setToast({ kind: 'err', message: e.message });
          // Refresh cart from server to repair optimistic state
          get().loadCart();
        }
      });
      set({ _qtyChain: next });
    }, 280);
    get()._qtyTimers[item_code] = t;
  },

  async removeItem(item_code) {
    return get().updateQty(item_code, 0);
  },

  async clearCart() {
    if (!get()._requireCustomer()) return;
    try {
      const cart = await api('agriflow.api.webshop.clear_cart', get()._args());
      set({ cart });
    } catch (e) {}
  },

  async submitQuotation(notes) {
    if (!get()._requireCustomer()) return;
    try {
      const r = await api('agriflow.api.webshop.submit_quotation', get()._args({ notes: notes || '' }));
      set({ view: 'confirmation', confirmation: r, cart: null, cartOpen: false });
      return r;
    } catch (e) {
      get().setToast({ kind: 'err', message: e.message });
      throw e;
    }
  },
}));
