import { useEffect } from 'react';
import Icon from './Icon';

export default function Drawer({ open, title, sub, onClose, children }) {
  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose && onClose(); }
    if (open) document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <>
      <div className="drawer-bd" onClick={onClose} />
      <div className="drawer">
        <div className="drawer-hd">
          <div className="drawer-title">
            {title}
            {sub && <small>{sub}</small>}
          </div>
          <button className="drawer-close" onClick={onClose} title="Close">
            <Icon name="close" />
          </button>
        </div>
        <div className="drawer-bd2">{children}</div>
      </div>
    </>
  );
}
