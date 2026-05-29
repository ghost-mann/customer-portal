import { useState } from 'react';
import { NAV } from '../nav';
import Icon from './Icon';
import { useStore } from '../store';
import { cn } from '@/lib/utils';

export default function Sidebar() {
  const section = useStore((s) => s.section);
  const table = useStore((s) => s.table);
  const select = useStore((s) => s.select);
  const [open, setOpen] = useState(() => ({ mail: true, [section]: true }));

  const handleSelect = (sec, tbl = '') => {
    select(sec, tbl);
    setOpen((o) => ({ ...o, [sec]: true }));
  };
  const toggle = (sec) => setOpen((o) => ({ ...o, [sec]: !o[sec] }));

  return (
    <aside className="bg-surface-2 border-r border-line overflow-y-auto flex flex-col pt-2.5 pb-4">
      <div className="px-2.5 pb-2">
        <button className="w-full h-9 bg-maroon text-white rounded-[5px] text-[13px] font-semibold flex items-center justify-center gap-2">
          <Icon name="edit_square" className="text-[18px]" />Compose
        </button>
      </div>
      {NAV.map((grp) => (
        <div key={grp.label}>
          <div className="font-mono text-[9px] font-semibold text-ink-3 uppercase tracking-[0.14em] px-3.5 pt-3 pb-1.5">{grp.label}</div>
          {grp.items.map((it) =>
            it.type === 'item' ? (
              <NavItem key={it.section} it={it} active={section === it.section && !table} onClick={() => handleSelect(it.section)} />
            ) : (
              <NavGroup key={it.section} it={it} section={section} table={table} open={!!open[it.section]} onToggle={() => toggle(it.section)} onSelect={handleSelect} />
            ),
          )}
        </div>
      ))}
    </aside>
  );
}

function NavItem({ it, active, onClick }) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'flex items-center gap-2.5 h-[30px] px-3 mx-1.5 rounded text-[12.5px] cursor-pointer select-none',
        active ? 'bg-maroon text-white font-medium' : 'text-ink-2 hover:bg-hover hover:text-ink',
      )}
    >
      <Icon name={it.icon} className="text-[17px] shrink-0" />
      <span>{it.label}</span>
    </div>
  );
}

function NavGroup({ it, section, table, open, onToggle, onSelect }) {
  const headActive = section === it.section && !table;
  return (
    <div className="mx-1.5">
      <div
        onClick={() => onSelect(it.section, '')}
        className={cn(
          'flex items-center gap-2.5 h-[30px] px-3 rounded text-[12.5px] cursor-pointer select-none',
          headActive ? 'bg-maroon text-white font-medium' : 'text-ink-2 hover:bg-hover hover:text-ink',
        )}
      >
        <Icon name={it.icon} className="text-[17px] shrink-0" />
        <span>{it.label}</span>
        {it.countKey && <span className="ml-auto font-mono text-[10px] text-ink-3 font-medium">—</span>}
        <Icon
          name="chevron_right"
          className={cn('text-[15px] text-ink-3 transition-transform', open && 'rotate-90', !it.countKey && 'ml-auto')}
          onClick={(e) => { e.stopPropagation(); onToggle(); }}
        />
      </div>
      {open && (
        <div className="pt-0.5 pb-1">
          {it.subs.map((sub) => (
            <div
              key={sub.table || 'dash'}
              onClick={() => onSelect(it.section, sub.table)}
              className={cn(
                'flex items-center gap-2 h-[26px] px-3 pl-8 mx-1 rounded text-xs cursor-pointer',
                section === it.section && table === sub.table ? 'bg-maroon-soft text-maroon-text font-medium' : 'text-ink-2 hover:bg-hover hover:text-ink',
              )}
            >
              <span>{sub.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
