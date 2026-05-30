import { useState } from 'react';
import Icon from '@shared/Icon';
import { apiPost } from '@shared/api';

export default function Contact({ content }) {
  const c = content || {};
  const contact = c.contact || {};
  const social = c.social || {};

  const [form, setForm] = useState({ name: '', email: '', phone: '', company: '', subject: '', message: '' });
  const [err, setErr] = useState(null);
  const [ok, setOk] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  function set(k, v) { setForm((s) => ({ ...s, [k]: v })); }

  async function submit(e) {
    e.preventDefault();
    setErr(null); setOk(null);
    if (!form.name || !form.email || !form.message) {
      setErr('Please fill your name, email, and message.');
      return;
    }
    setSubmitting(true);
    try {
      const r = await apiPost('customer_portal.api.site.submit_contact_inquiry', form);
      setOk({ ref: r?.name, kind: r?.kind });
      setForm({ name: '', email: '', phone: '', company: '', subject: '', message: '' });
    } catch (e) {
      setErr(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <section className="hero" style={{ padding: '64px 0 32px' }}>
        <div className="container-narrow" style={{ textAlign: 'center' }}>
          <div className="hero-eyebrow" style={{ justifyContent: 'center' }}>GET IN TOUCH</div>
          <h1 className="hero-title" style={{ fontSize: 'clamp(36px, 4.5vw, 56px)' }}>
            Let's <em>talk.</em>
          </h1>
          <p className="hero-subtitle" style={{ margin: '20px auto 0' }}>
            Tell us a bit about who you are and what you need. We'll come back within one business day with what we have.
          </p>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 32 }}>
        <div className="container">
          <div className="contact-row">
            <div className="contact-info">
              <h3 className="section-title" style={{ fontSize: 24, marginBottom: 24 }}>Find us</h3>

              {contact.email && (<><dt>Email</dt><dd><a href={`mailto:${contact.email}`}>{contact.email}</a></dd></>)}
              {contact.phone && (<><dt>Phone</dt><dd><a href={`tel:${contact.phone}`}>{contact.phone}</a></dd></>)}
              {contact.address && (<><dt>Address</dt><dd style={{ whiteSpace: 'pre-line' }}>{contact.address}</dd></>)}
              {contact.hours && (<><dt>Hours</dt><dd>{contact.hours}</dd></>)}

              <div className="social-row">
                {social.linkedin && <a href={social.linkedin} target="_blank" rel="noreferrer" title="LinkedIn"><Icon name="link" /></a>}
                {social.instagram && <a href={social.instagram} target="_blank" rel="noreferrer" title="Instagram"><Icon name="photo_camera" /></a>}
                {social.facebook && <a href={social.facebook} target="_blank" rel="noreferrer" title="Facebook"><Icon name="public" /></a>}
              </div>
            </div>

            <form className="contact-form" onSubmit={submit}>
              <div className="grid2">
                <div className="fg">
                  <label className="fl">Name<span className="req"> *</span></label>
                  <input className="fc" type="text" value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Your name" />
                </div>
                <div className="fg">
                  <label className="fl">Company</label>
                  <input className="fc" type="text" value={form.company} onChange={(e) => set('company', e.target.value)} placeholder="Optional" />
                </div>
              </div>
              <div className="grid2">
                <div className="fg">
                  <label className="fl">Email<span className="req"> *</span></label>
                  <input className="fc" type="email" value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="you@company.com" />
                </div>
                <div className="fg">
                  <label className="fl">Phone</label>
                  <input className="fc" type="tel" value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="Optional" />
                </div>
              </div>
              <div className="fg">
                <label className="fl">Subject</label>
                <input className="fc" type="text" value={form.subject} onChange={(e) => set('subject', e.target.value)} placeholder="What's this about?" />
              </div>
              <div className="fg">
                <label className="fl">Message<span className="req"> *</span></label>
                <textarea className="fc" value={form.message} onChange={(e) => set('message', e.target.value)} placeholder="Tell us what you need…" rows={6} />
              </div>

              {err && <div className="alert alert-err"><Icon name="error" />{err}</div>}
              {ok && (
                <div className="alert alert-ok">
                  <Icon name="check_circle" />
                  Thanks — your message is in. We'll be in touch within a business day{ok.ref ? <> (ref <code style={{ fontFamily:'var(--mono)', fontSize: 12 }}>{ok.ref}</code>).</> : '.'}
                </div>
              )}

              <div style={{ marginTop: 18, display: 'flex', justifyContent: 'flex-end' }}>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  <Icon name="send" />
                  {submitting ? 'Sending…' : 'Send message'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </section>
    </>
  );
}
