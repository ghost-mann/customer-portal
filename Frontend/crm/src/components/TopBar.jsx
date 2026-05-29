import { useState } from 'react';
import Icon from './Icon';
import { useStore } from '../store';
import { cn } from '@/lib/utils';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';

const PRESETS = [['7d', 'Last 7 days'], ['30d', 'Last 30 days'], ['90d', 'Last 90 days'], ['ytd', 'Year to date']];
const STATUS_LABEL = { idle: '—', loading: 'Loading', live: 'Live', partial: 'Partial', offline: 'Offline' };

export default function TopBar({ onSettings }) {
  const { search, setSearch, datePreset, dateFrom, dateTo, setDateRange, status, loadAll } = useStore();
  const [from, setFrom] = useState(dateFrom);
  const [to, setTo] = useState(dateTo);

  const label = datePreset === 'custom'
    ? `${dateFrom} → ${dateTo}`
    : (PRESETS.find((p) => p[0] === datePreset)?.[1] || 'Last 30 days');

  return (
    <header className="flex items-center gap-3 h-12 px-3.5 bg-maroon text-white shrink-0">
      <div className="flex items-center gap-2.5 pr-3.5 border-r border-white/15 h-full">
        <div className="w-7 h-7 bg-white text-maroon rounded-[5px] flex items-center justify-center font-mono font-bold text-xs">KR</div>
        <div className="flex flex-col leading-[1.1]">
          <b className="text-[13px] font-semibold -tracking-[0.01em]">CRM</b>
          <small className="font-mono text-[9px] opacity-70 tracking-[0.12em] uppercase mt-px">Karen Roses</small>
        </div>
      </div>

      <div className="flex-1 max-w-[480px] h-[30px] bg-white/[0.12] rounded-[5px] flex items-center px-2.5 gap-2">
        <Icon name="search" className="text-[18px] opacity-80" />
        <input
          className="flex-1 bg-transparent border-none outline-none text-white text-xs placeholder:text-white/60"
          placeholder="Search leads, opportunities, customers…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-1.5 h-[30px] px-2.5 bg-white/[0.12] rounded-[5px] text-[11.5px]">
              <Icon name="date_range" className="text-[16px]" />
              <span>{label}</span>
              <Icon name="expand_more" className="text-[14px]" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[260px] p-2.5">
            <div className="grid gap-1">
              {PRESETS.map(([k, lbl]) => (
                <button
                  key={k}
                  onClick={() => setDateRange(k)}
                  className={cn('text-left text-xs px-2 py-1.5 rounded hover:bg-accent', datePreset === k && 'bg-maroon-soft text-maroon-text font-medium')}
                >
                  {lbl}
                </button>
              ))}
            </div>
            <div className="border-t border-line mt-2 pt-2 grid gap-1.5">
              <label className="text-[10px] font-mono uppercase text-ink-3">Custom range</label>
              <div className="flex items-center gap-2 text-xs"><span className="w-9 text-ink-3">From</span><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-7 text-xs" /></div>
              <div className="flex items-center gap-2 text-xs"><span className="w-9 text-ink-3">To</span><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-7 text-xs" /></div>
              <button onClick={() => setDateRange('custom', { from, to })} className="mt-1 h-7 rounded bg-maroon text-white text-xs font-medium">Apply custom range</button>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className={cn('flex items-center gap-1.5 px-2 py-1 rounded-[3px] font-mono text-[9.5px] font-medium tracking-[0.08em] uppercase', status === 'offline' ? 'bg-bad/80' : 'bg-white/[0.12]')}>
          <span className={cn('w-1.5 h-1.5 rounded-full', status === 'live' ? 'bg-emerald-300' : status === 'offline' ? 'bg-red-300' : 'bg-amber-300')} />
          {STATUS_LABEL[status] || '—'}
        </div>
        <button onClick={() => loadAll()} className="w-[30px] h-[30px] rounded-[5px] text-white/85 hover:bg-white/10 flex items-center justify-center" title="Refresh now">
          <Icon name="refresh" className="text-[18px]" />
        </button>
        <button onClick={onSettings} className="w-[30px] h-[30px] rounded-[5px] text-white/85 hover:bg-white/10 flex items-center justify-center" title="Settings">
          <Icon name="settings" className="text-[18px]" />
        </button>
      </div>
    </header>
  );
}
