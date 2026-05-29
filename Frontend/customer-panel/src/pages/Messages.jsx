import { useEffect } from 'react';
import { useStore } from '../store';
import { avatarBg, fmtRelative, initials, nameFromAddress } from '@shared/utils';
import Card from '../components/Card';
import Icon from '@shared/Icon';
import EmptyState from '../components/EmptyState';
import Drawer from '../components/Drawer';

export default function Messages() {
  const { data, loadList, loadDetail, detail, setDetail } = useStore();
  useEffect(() => { if (data.messages.rows == null) loadList('messages'); }, []);
  const { rows, err } = data.messages;

  if (rows == null) return <div className="loading">Loading messages</div>;
  if (err) return <div className="alert alert-err"><Icon name="error" />{err}</div>;

  return (
    <>
      <Card title="Messages" sub={`${rows.length} message${rows.length === 1 ? '' : 's'} from our team`} flush>
        {rows.length ? rows.map((m) => {
          const cp = m.sent_or_received === 'Sent' ? (m.recipients || '') : (m.sender || '');
          const name = nameFromAddress(cp) || cp || '—';
          return (
            <div className="msg-row" key={m.name} onClick={() => loadDetail('messages', m.name)}>
              <div className="msg-av" style={{ background: avatarBg(name) }}>{initials(name)}</div>
              <div className="msg-meta">
                <div className="msg-sender">{name}</div>
                <div className="msg-subj">{m.subject || '(no subject)'}</div>
              </div>
              <div className="msg-time">{fmtRelative(m.communication_date)}</div>
            </div>
          );
        }) : <EmptyState icon="mail" title="No messages yet" hint="Emails from your account manager will appear here." />}
      </Card>

      <Drawer open={detail?.kind === 'messages'} title={detail?.doc?.subject || detail?.name} sub="Message" onClose={() => setDetail(null)}>
        {detail?.loading && <div className="loading">Loading</div>}
        {detail?.err && <div className="alert alert-err"><Icon name="error" />{detail.err}</div>}
        {detail?.doc && (
          <>
            <div className="summary-row"><span className="sr-label">From</span><span className="sr-value">{nameFromAddress(detail.doc.sender || '') || detail.doc.sender}</span></div>
            <div className="summary-row"><span className="sr-label">To</span><span className="sr-value">{detail.doc.recipients}</span></div>
            <div className="summary-row"><span className="sr-label">When</span><span className="sr-value">{fmtRelative(detail.doc.communication_date)}</span></div>
            <div className="divider" />
            <div dangerouslySetInnerHTML={{ __html: detail.doc.content || '<div style="color:var(--text-3)">No body content.</div>' }} />
          </>
        )}
      </Drawer>
    </>
  );
}
