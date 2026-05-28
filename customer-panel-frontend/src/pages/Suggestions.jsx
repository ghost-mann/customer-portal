import { useState } from 'react';
import { useStore } from '../store';
import Card from '../components/Card';
import Icon from '../components/Icon';

const TYPES = [
  { key: 'Suggestion',       icon: 'lightbulb',  label: 'Suggestion',  desc: 'An idea to help us improve our service or products.' },
  { key: 'Compliment',       icon: 'thumb_up',   label: 'Compliment',  desc: 'Something we did well that you want to recognise.' },
  { key: 'General Feedback', icon: 'forum',      label: 'General',     desc: 'Any other comment, question or observation.' },
];

export default function Suggestions() {
  const { ctx, submitSuggestion } = useStore();
  const [type, setType] = useState('Suggestion');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [rating, setRating] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState(null);
  const [ok, setOk] = useState(null);

  async function submit() {
    if (!body.trim()) { setErr('Please write your feedback before submitting.'); return; }
    setSubmitting(true); setErr(null);
    try {
      const r = await submitSuggestion({
        feedback_type: type,
        subject,
        body,
        rating: type === 'Compliment' ? rating : null,
        contact_name: ctx?.full_name,
        contact_email: ctx?.user,
      });
      setOk({ name: r?.name || '—' });
      setSubject(''); setBody(''); setRating(0);
    } catch (e) { setErr(e.message); }
    finally { setSubmitting(false); }
  }

  if (ok) return (
    <Card>
      <div className="success-wrap">
        <div className="success-mark"><Icon name="check" /></div>
        <div className="success-title">Thank you</div>
        <div className="success-text">Your {type.toLowerCase()} has been logged. Our team reads every message — we'll be in touch if we have follow-up questions.</div>
        <div className="ref-box">
          <div className="ref-label">Reference</div>
          <div className="ref-number">{ok.name}</div>
        </div>
        <button className="btn btn-secondary" onClick={() => setOk(null)}><Icon name="add" /> Send another</button>
      </div>
    </Card>
  );

  return (
    <Card title="Share your feedback" sub="We read everything">
      <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 10 }}>Type</div>
      <div className="type-grid">
        {TYPES.map((t) => (
          <button key={t.key} className={`type-card ${type === t.key ? 'selected' : ''}`} onClick={() => setType(t.key)}>
            <div className="type-icon"><Icon name={t.icon} /></div>
            <div className="type-name">{t.label}</div>
            <div className="type-desc">{t.desc}</div>
          </button>
        ))}
      </div>

      {type === 'Compliment' && (
        <div className="fg">
          <label className="fl">Overall experience</label>
          <div style={{ display: 'flex', gap: 6, marginTop: 2 }}>
            {[1,2,3,4,5].map((n) => (
              <button
                key={n}
                className={`btn ${rating === n ? 'btn-primary' : 'btn-secondary'}`}
                style={{ width: 38, height: 38, justifyContent: 'center', padding: 0 }}
                onClick={() => setRating(n)}
              >{n}</button>
            ))}
            <span style={{ marginLeft: 10, alignSelf: 'center', fontSize: 11.5, color: 'var(--text-3)' }}>
              {['','Poor','Fair','Good','Very good','Excellent'][rating] || 'Tap to rate'}
            </span>
          </div>
        </div>
      )}

      <div className="fg">
        <label className="fl">Subject</label>
        <input className="fc" placeholder="One-line summary (optional)" value={subject} onChange={(e) => setSubject(e.target.value)} />
      </div>
      <div className="fg">
        <label className="fl">Your message<span className="req">*</span></label>
        <textarea className="fc" rows={7} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Tell us more…" />
      </div>

      {err && <div className="alert alert-err"><Icon name="error" />{err}</div>}

      <div className="action-row">
        <span className="help">From: {ctx?.full_name} · {ctx?.user}</span>
        <div className="spacer" />
        <button className="btn btn-primary" onClick={submit} disabled={submitting}>
          <Icon name="send" />{submitting ? 'Sending…' : 'Send'}
        </button>
      </div>
    </Card>
  );
}
