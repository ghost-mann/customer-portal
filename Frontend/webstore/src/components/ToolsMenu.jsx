import { useEffect, useRef, useState } from 'react';
import { getPortalHref } from '../lib/auth';

// Kebab (⋮) tools menu for the Shop toolbar — a small grab-bag of
// navigation shortcuts that don't warrant their own toolbar buttons:
// jumping to the Desk, the Customer Portal (same guest/logged-in
// destination as Nav's top-right link — see lib/auth.getPortalHref), and
// resetting the store's active filters. Closes on outside-click or Escape,
// same as any floating menu should.
export default function ToolsMenu({ onClearFilters }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    }
    function onKeyDown(e) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const portalHref = getPortalHref();

  return (
    <div ref={wrapRef}>
      <button
        type="button"
        className="ws-icon-btn"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Tools menu"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="material-symbols-outlined" aria-hidden="true">more_vert</span>
      </button>

      {open && (
        <div className="ws-tools-menu" role="menu">
          <button
            type="button"
            role="menuitem"
            className="ws-tools-menu-item"
            onClick={() => { window.location.href = '/app'; }}
          >
            <span className="material-symbols-outlined" aria-hidden="true">dashboard</span>
            Back to Desk
          </button>
          <a role="menuitem" className="ws-tools-menu-item" href={portalHref}>
            <span className="material-symbols-outlined" aria-hidden="true">account_circle</span>
            Customer Portal
          </a>
          <button
            type="button"
            role="menuitem"
            className="ws-tools-menu-item"
            onClick={() => { setOpen(false); onClearFilters(); }}
          >
            <span className="material-symbols-outlined" aria-hidden="true">filter_alt_off</span>
            Clear filters
          </button>
        </div>
      )}
    </div>
  );
}
