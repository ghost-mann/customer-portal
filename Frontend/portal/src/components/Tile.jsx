export default function Tile({ icon, title, desc, cta, href, variant, locked, lockReason }) {
  const className = `tile${variant ? ' tile-' + variant : ''}${locked ? ' locked' : ''}`;
  const inner = (
    <>
      {locked && (
        <div className="tile-locked-badge">
          <span className="material-symbols-outlined">lock</span>
          {lockReason || 'No access'}
        </div>
      )}
      <div className="tile-icon">
        <span className="material-symbols-outlined">{icon}</span>
      </div>
      <div className="tile-title">{title}</div>
      <div className="tile-desc">{desc}</div>
      <div className="tile-cta">
        {locked ? 'Locked' : (cta || 'Enter')}
        {!locked && <span className="material-symbols-outlined">arrow_forward</span>}
      </div>
    </>
  );
  if (locked) return <div className={className}>{inner}</div>;
  return <a className={className} href={href}>{inner}</a>;
}
