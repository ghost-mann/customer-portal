import { useEffect, useState } from 'react';
import TopBar from './components/TopBar';
import Sidebar from './components/Sidebar';
import SettingsSheet from './components/SettingsSheet';
import Overview from './sections/Overview';
import { useStore, setupAutoRefresh, SECTION_META } from './store';

function fmtTime(d) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

function Placeholder({ section }) {
  return (
    <div className="p-10 text-center text-ink-3 font-mono text-[11px]">
      “{section}” section — coming in the next phase.
    </div>
  );
}

export default function App() {
  const { section, table, loadAll, lastUpdated } = useStore();
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    loadAll();
    setupAutoRefresh();
  }, [loadAll]);

  const meta = SECTION_META[section] || SECTION_META.overview;
  const updated = lastUpdated ? fmtTime(lastUpdated) : '—';
  const isOverview = section === 'overview' && !table;

  return (
    <div className="flex flex-col h-screen text-ink">
      <TopBar onSettings={() => setSettingsOpen(true)} />
      <div className="grid grid-cols-[230px_1fr] h-[calc(100vh-48px)]">
        <Sidebar />
        <main className="bg-surface overflow-hidden flex flex-col">
          <div className="flex items-end justify-between gap-3 px-5 pt-3.5 pb-2.5 border-b border-line">
            <div>
              <div className="text-[18px] font-semibold -tracking-[0.01em]">{meta.title}</div>
              <div className="font-mono text-[10px] text-ink-3 uppercase tracking-[0.1em] mt-0.5">{meta.sub}</div>
            </div>
            <div className="font-mono text-[10.5px] text-ink-3">Updated {updated}</div>
          </div>
          <div className="flex-1 overflow-y-auto px-5 pt-3.5 pb-8">
            {isOverview ? <Overview /> : <Placeholder section={section} />}
          </div>
        </main>
      </div>
      <SettingsSheet open={settingsOpen} onOpenChange={setSettingsOpen} />
    </div>
  );
}
