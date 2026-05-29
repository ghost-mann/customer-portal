import { initials, shortUser } from '@shared/utils';

export default function Nav({ user, fullName, isGuest, onLogout }) {
  return (
    <nav className="nav">
      <a href="/portal" className="brand">
        <div className="brand-mark">AF</div>
        <b>agriflow</b>
      </a>
      <div className="nav-right">
        {isGuest ? (
          <a className="btn-secondary" href="/login?redirect-to=/portal">
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>login</span>
            Sign in
          </a>
        ) : (
          <div className="user-chip" title={user}>
            <div className="av">{initials(fullName || user)}</div>
            <span>{fullName || shortUser(user)}</span>
            <span className="logout" onClick={onLogout}>Sign out</span>
          </div>
        )}
      </div>
    </nav>
  );
}
