import { create } from 'zustand';
import { getProductFilterData } from './lib/api';

export const useStore = create((set, get) => ({
  // `settings` is the full Webshop Settings doc, embedded on every
  // get_product_filter_data response — no separate settings endpoint exists.
  settings: null,
  items: [],
  filters: {},
  subCategories: [],
  itemsCount: 0,
  loading: true,
  error: null,

  // UI open-state flags used by later phases (cart drawer, etc.)
  ui: { cartOpen: false },
  setUi: (patch) => set((s) => ({ ui: { ...s.ui, ...patch } })),

  bootstrap: async () => {
    set({ loading: true, error: null });
    try {
      const data = await getProductFilterData({});
      set({
        settings: data.settings || null,
        items: data.items || [],
        filters: data.filters || {},
        subCategories: data.sub_categories || [],
        itemsCount: data.items_count || 0,
        loading: false,
      });
    } catch (e) {
      set({ error: String(e), loading: false });
    }
  },
}));
