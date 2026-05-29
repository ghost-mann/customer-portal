import { create } from 'zustand';
import { SECTION_LOADERS } from './api';

const SETTINGS_KEY = 'crm_settings';

export const DEFAULT_SETTINGS = {
  autoRefresh: true,
  refreshIntervalSec: 60,
  defaultDateRange: '30d', // '7d' | '30d' | '90d' | 'ytd' | 'custom'
  openInNewTab: true,
};

function loadSettings() {
  try {
    return { ...DEFAULT_SETTINGS, ...(JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {}) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

// Ported verbatim from the source page.
export function dateRangePreset(preset) {
  const now = new Date();
  const p = (n) => String(n).padStart(2, '0');
  const ymd = (d) => `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  const to = ymd(now);
  let from;
  switch (preset) {
    case '7d':  { const d = new Date(now); d.setDate(d.getDate() - 7);  from = ymd(d); break; }
    case '90d': { const d = new Date(now); d.setDate(d.getDate() - 90); from = ymd(d); break; }
    case 'ytd': { from = `${now.getFullYear()}-01-01`; break; }
    case '30d':
    default:    { const d = new Date(now); d.setDate(d.getDate() - 30); from = ymd(d); break; }
  }
  return { from, to, preset };
}

const _settings = loadSettings();
const _initialRange = dateRangePreset(_settings.defaultDateRange === 'custom' ? '30d' : _settings.defaultDateRange);

// The 8 nav sections (Overview is standalone; the rest map to loaders).
export const SECTION_META = {
  overview: { title: 'CRM Command Center', sub: 'Pipeline · activity · revenue' },
  mail:     { title: 'Inbox',              sub: 'Email · folders · threads' },
  leads:    { title: 'Leads',              sub: 'Inbound · qualification · conversion' },
  opps:     { title: 'Opportunities',      sub: 'Pipeline · stages · win rate' },
  prosp:    { title: 'Prospects',          sub: 'Engaged accounts · conversion' },
  cust:     { title: 'Customers',          sub: 'Active accounts · revenue · segmentation' },
  evt:      { title: 'Events, Tasks & Emails', sub: 'Meetings · ToDos · communications' },
  act:      { title: 'Activity Log',       sub: 'CRM triggers · audit trail' },
};

export const useStore = create((set, get) => ({
  data: {},
  section: 'overview',
  table: '',
  search: '',
  settings: _settings,
  dateFrom: _initialRange.from,
  dateTo: _initialRange.to,
  datePreset: _initialRange.preset,
  status: 'idle', // idle | loading | live | partial | offline
  lastUpdated: null,

  select(section, table = '') {
    set({ section, table });
  },

  setSearch(search) { set({ search }); },

  setDateRange(preset, custom) {
    const r = preset === 'custom' && custom
      ? { from: custom.from, to: custom.to, preset: 'custom' }
      : dateRangePreset(preset);
    set({ dateFrom: r.from, dateTo: r.to, datePreset: r.preset });
    get().loadAll();
  },

  saveSettings(patch) {
    const settings = { ...get().settings, ...patch };
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch {}
    set({ settings });
  },

  async loadAll(opts = {}) {
    const silent = !!opts.silent;
    if (!silent) set({ status: 'loading' });
    const args = { date_from: get().dateFrom, date_to: get().dateTo };
    const keys = Object.keys(SECTION_LOADERS);
    const results = await Promise.allSettled(keys.map((k) => SECTION_LOADERS[k](args)));
    const data = { ...get().data };
    let failed = 0;
    results.forEach((r, i) => {
      if (r.status === 'fulfilled' && r.value && !r.value.error) data[keys[i]] = r.value;
      else failed++;
    });
    if (failed === results.length) {
      set({ status: 'offline' });
      return;
    }
    set({ data, status: failed ? 'partial' : 'live', lastUpdated: new Date() });
  },
}));

let _timer = null;
// Auto-refresh loop driven by settings.
export function setupAutoRefresh() {
  const { settings, loadAll } = useStore.getState();
  if (_timer) { clearInterval(_timer); _timer = null; }
  if (settings.autoRefresh) {
    const ms = Math.max(15, settings.refreshIntervalSec) * 1000;
    _timer = setInterval(() => loadAll({ silent: true }), ms);
  }
}
