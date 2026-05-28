import { create } from 'zustand';
import { api } from './api';

export const useStore = create((set, get) => ({
  // Auth + context
  ctx: null,           // {user, full_name, customer, customer_name, is_staff}
  loadingCtx: true,
  ctxError: null,

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

  setFilter(patch) {
    set({ filters: { ...get().filters, ...patch } });
    get().loadItems();
  },

  async bootstrap() {
    set({ loadingCtx: true, ctxError: null });
    try {
      const ctx = await api('agriflow.api.customer.get_my_context');
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
      const r = await api('agriflow.api.webshop.list_categories');
      set({ categories: r || [] });
    } catch (e) { set({ categories: [] }); }
  },

  async loadFarms() {
    try {
      const r = await api('agriflow.api.webshop.list_farms');
      set({ farms: r || [] });
    } catch (e) { set({ farms: [] }); }
  },

  async loadItems() {
    set({ loadingItems: true, itemsError: null });
    const f = get().filters;
    try {
      const r = await api('agriflow.api.webshop.list_items', {
        category:  f.category,
        search:    f.search,
        farm:      f.farm,
        in_season: f.inSeason ? 1 : 0,
        limit: 120,
      });
      set({ items: r || [], loadingItems: false });
    } catch (e) {
      set({ items: [], loadingItems: false, itemsError: e.message });
    }
  },

  async loadDetail(name) {
    set({ detail: { item: null, loading: true, err: null } });
    try {
      const item = await api('agriflow.api.webshop.get_item', { name });
      set({ detail: { item, loading: false, err: null } });
    } catch (e) {
      set({ detail: { item: null, loading: false, err: e.message } });
    }
  },
  closeDetail() { set({ detail: null }); },

  async loadCart() {
    set({ loadingCart: true, cartError: null });
    try {
      const cart = await api('agriflow.api.webshop.get_cart');
      set({ cart, loadingCart: false });
    } catch (e) {
      set({ loadingCart: false, cartError: e.message });
    }
  },

  async addToCart(item_code, qty = 1) {
    try {
      const cart = await api('agriflow.api.webshop.add_to_cart', { item_code, qty });
      set({ cart });
      return cart;
    } catch (e) {
      set({ cartError: e.message });
      throw e;
    }
  },

  async updateQty(item_code, qty) {
    try {
      const cart = await api('agriflow.api.webshop.update_qty', { item_code, qty });
      set({ cart });
    } catch (e) { set({ cartError: e.message }); }
  },

  async removeItem(item_code) {
    return get().updateQty(item_code, 0);
  },

  async clearCart() {
    try {
      const cart = await api('agriflow.api.webshop.clear_cart');
      set({ cart });
    } catch (e) {}
  },

  async submitQuotation(notes) {
    try {
      const r = await api('agriflow.api.webshop.submit_quotation', { notes: notes || '' });
      set({ view: 'confirmation', confirmation: r, cart: null, cartOpen: false });
      return r;
    } catch (e) {
      set({ cartError: e.message });
      throw e;
    }
  },
}));
