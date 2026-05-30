import { create } from 'zustand';
import { api, apiPost } from '@shared/api';

const IMPER_KEY = 'customer_portal_impersonate';

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
  page: 'overview',
  ctx: null,
  loading: true,
  loadError: null,

  // Staff-only impersonation: when set, all API calls pass `customer=<name>`
  impersonate: loadImpersonate(),

  data: {
    overview: null,
    orders:    { rows: null, err: null },
    shipments: { rows: null, err: null },
    claims:    { rows: null, err: null },
    invoices:  { rows: null, err: null },
    messages:  { rows: null, err: null },
  },

  detail: null,
  setDetail(d) { set({ detail: d }); },
  setPage(page) { set({ page, detail: null }); },

  _args() {
    const im = get().impersonate;
    return im ? { customer: im } : {};
  },

  async setImpersonate(name) {
    saveImpersonate(name || null);
    set({
      impersonate: name || null,
      // Clear cached lists so they refetch under the new customer scope
      data: {
        overview: null,
        orders:    { rows: null, err: null },
        shipments: { rows: null, err: null },
        claims:    { rows: null, err: null },
        invoices:  { rows: null, err: null },
        messages:  { rows: null, err: null },
      },
      detail: null,
    });
    await get().bootstrap();
  },

  async bootstrap() {
    set({ loading: true, loadError: null });
    try {
      const ctx = await api('customer_portal.api.customer.get_my_context', get()._args());
      set({ ctx, loading: false });
      get().loadOverview();
    } catch (e) {
      set({ loading: false, loadError: e.message });
    }
  },

  async loadOverview() {
    try {
      const ov = await api('customer_portal.api.customer.get_overview', get()._args());
      set((s) => ({ data: { ...s.data, overview: ov } }));
    } catch (e) {
      set((s) => ({ data: { ...s.data, overview: { error: e.message } } }));
    }
  },

  async loadList(kind) {
    set((s) => ({ data: { ...s.data, [kind]: { rows: null, err: null } } }));
    const map = {
      orders:    'customer_portal.api.customer.list_orders',
      shipments: 'customer_portal.api.customer.list_shipments',
      claims:    'customer_portal.api.customer.list_claims',
      invoices:  'customer_portal.api.customer.list_invoices',
      messages:  'customer_portal.api.customer.list_messages',
    };
    try {
      const rows = await api(map[kind], get()._args()) || [];
      set((s) => ({ data: { ...s.data, [kind]: { rows, err: null } } }));
    } catch (e) {
      set((s) => ({ data: { ...s.data, [kind]: { rows: [], err: e.message } } }));
    }
  },

  async loadDetail(kind, name) {
    set({ detail: { kind, name, doc: null, loading: true, err: null } });
    try {
      const doc = await api('customer_portal.api.customer.get_doc', { ...get()._args(), doctype_kind: kind, name });
      set({ detail: { kind, name, doc, loading: false, err: null } });
    } catch (e) {
      set({ detail: { kind, name, doc: null, loading: false, err: e.message } });
    }
  },

  async replyMessage(name, content) {
    const html = String(content || '').trim().replace(/\n/g, '<br>');
    const res = await apiPost('customer_portal.api.customer.reply_to_message', {
      ...get()._args(), name, content: html,
    });
    // Refresh the thread so the new reply appears in the list
    get().loadList('messages');
    return res;
  },

  async submitClaim(payload) {
    return apiPost('customer_portal.api.customer.submit_claim', payload);
  },

  async submitSuggestion(payload) {
    return apiPost('customer_portal.api.customer.submit_suggestion', payload);
  },
}));
