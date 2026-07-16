import { create } from 'zustand';
import { getSettings, getHome } from './lib/api';

export const useStore = create((set, get) => ({
  settings: window.webshop_settings || null,
  home: null,
  loading: true,
  error: null,

  // UI open-state flags used by later phases (cart drawer, etc.)
  ui: { cartOpen: false },
  setUi: (patch) => set((s) => ({ ui: { ...s.ui, ...patch } })),

  bootstrap: async () => {
    set({ loading: true, error: null });
    try {
      const [settings, home] = await Promise.all([
        get().settings ? Promise.resolve(get().settings) : getSettings(),
        getHome(),
      ]);
      set({ settings, home, loading: false });
    } catch (e) {
      set({ error: String(e), loading: false });
    }
  },
}));
