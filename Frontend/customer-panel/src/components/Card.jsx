export default function Card({ title, sub, flush, action, children }) {
  return (
    <div className="card">
      {(title || sub || action) && (
        <div className="card-hd">
          <div>
            {title && <div className="card-title">{title}</div>}
            {sub && <div className="card-sub">{sub}</div>}
          </div>
          {action}
        </div>
      )}
      <div className={`card-body${flush ? ' flush' : ''}`}>{children}</div>
    </div>
  );
}
