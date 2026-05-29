import { useStore } from '../store';
import Card from '../components/Card';
import Icon from '@shared/Icon';
import { avatarBg, initials } from '@shared/utils';

export default function Account() {
  const { ctx } = useStore();
  if (!ctx) return <div className="loading">Loading account</div>;

  return (
    <div className="grid g21">
      <Card title="Company" sub="Your customer account">
        <div className="summary-row"><span className="sr-label">Customer</span><span className="sr-value">{ctx.customer_name}</span></div>
        <div className="summary-row"><span className="sr-label">Customer ID</span><span className="sr-value mono">{ctx.customer}</span></div>
        <div className="summary-row"><span className="sr-label">Type</span><span className="sr-value">{ctx.customer_type || '—'}</span></div>
        <div className="summary-row"><span className="sr-label">Group</span><span className="sr-value">{ctx.customer_group || '—'}</span></div>
        <div className="summary-row"><span className="sr-label">Territory</span><span className="sr-value">{ctx.territory || '—'}</span></div>
        <div className="summary-row"><span className="sr-label">Currency</span><span className="sr-value">{ctx.currency}</span></div>
        <div className="summary-row"><span className="sr-label">Payment terms</span><span className="sr-value">{ctx.payment_terms || '—'}</span></div>
        <div className="divider" />
        <div className="action-row" style={{ marginTop: 0, paddingTop: 0, border: 'none' }}>
          <a className="btn btn-secondary" href={`/app/customer/${encodeURIComponent(ctx.customer)}`} target="_blank" rel="noreferrer">
            <Icon name="open_in_new" /> View customer record
          </a>
          <div className="spacer" />
          <a className="btn btn-secondary" href="mailto:support@upande.com">
            <Icon name="support" /> Contact Upande support
          </a>
        </div>
      </Card>

      <div>
        <Card title="Your account manager">
          {ctx.manager ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: avatarBg(ctx.manager.name), color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--mono)', fontWeight: 600, fontSize: 18 }}>
                {initials(ctx.manager.name)}
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 500 }}>{ctx.manager.name}</div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 11.5, color: 'var(--text-3)', marginTop: 4 }}>{ctx.manager.email}</div>
                <a className="btn btn-primary" style={{ marginTop: 10 }} href={`mailto:${ctx.manager.email}`}>
                  <Icon name="mail" /> Email them
                </a>
              </div>
            </div>
          ) : (
            <div style={{ fontSize: 13, color: 'var(--text-3)' }}>
              No account manager assigned yet. Reach us at <a href="mailto:sales@upande.com" style={{ color: 'var(--accent)' }}>sales@upande.com</a>.
            </div>
          )}
        </Card>

        <Card title="Signed in as">
          <div className="summary-row"><span className="sr-label">User</span><span className="sr-value mono">{ctx.user}</span></div>
          <div className="summary-row"><span className="sr-label">Name</span><span className="sr-value">{ctx.full_name}</span></div>
          {ctx.is_staff && (
            <div className="alert alert-info" style={{ marginTop: 12 }}>
              <Icon name="shield" />
              <div>You're signed in as staff — you can view customer portals on behalf of any customer.</div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
