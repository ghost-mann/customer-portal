export default function SignedOut() {
  return (
    <div className="shell">
      <div className="center">
        <div className="sign-in-card">
          <div className="lead-icon">
            <span className="material-symbols-outlined">spa</span>
          </div>
          <h2>Member access only</h2>
          <p>The Agriflow portal is for our sales team and approved customers. Sign in to reach your tools.</p>
          <a className="btn-primary" href="/login?redirect-to=/portal">
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>login</span>
            Sign in to continue
          </a>
        </div>
      </div>
    </div>
  );
}
