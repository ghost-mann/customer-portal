import { useEffect, useState } from 'react';
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
            <div className="divider" />
            <ReplyBox key={detail.doc.name} doc={detail.doc} />
          </>
        )}
      </Drawer>
    </>
  );
}

function ReplyBox({ doc }) {
  const { ctx, replyMessage } = useStore();
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState(null);
  const [ok, setOk] = useState(null);

  // Who the reply will go to — mirrors the backend's logic.
  const replyTo = doc.sent_or_received === 'Sent' ? (doc.sender || '') : (doc.recipients || '');
  const toName = nameFromAddress(replyTo) || replyTo || 'our team';

  async function send() {
    if (!body.trim()) { setErr('Please write a reply before sending.'); return; }
    setSending(true); setErr(null);
    try {
      const r = await replyMessage(doc.name, body);
      setOk(r);
      setBody('');
    } catch (e) { setErr(e.message); }
    finally { setSending(false); }
  }

  if (ok) return (
    <div className="alert" style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-2)' }}>
      <Icon name="check" />
      {ok.status === 'sent' ? `Reply sent to ${toName}.` : `Reply saved — it will be delivered once mail is configured.`}
    </div>
  );

  if (!open) return (
    <button className="btn btn-secondary" onClick={() => setOpen(true)}>
      <Icon name="reply" /> Reply
    </button>
  );

  return (
    <div className="fg">
      <label className="fl">Reply to {toName}</label>
      <textarea
        className="fc"
        rows={6}
        autoFocus
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Write your reply…"
      />
      {err && <div className="alert alert-err"><Icon name="error" />{err}</div>}
      <div className="action-row">
        <span className="help">From: {ctx?.full_name} · {ctx?.user}</span>
        <div className="spacer" />
        <button className="btn btn-secondary" onClick={() => { setOpen(false); setErr(null); }} disabled={sending}>Cancel</button>
        <button className="btn btn-primary" onClick={send} disabled={sending}>
          <Icon name="send" />{sending ? 'Sending…' : 'Send reply'}
        </button>
      </div>
    </div>
  );
}
