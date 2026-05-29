import { useEffect, useState } from 'react';
import { useStore } from '../store';
import { fmt, fmtDate, fmtMoneyCompact as fmtMoney } from '@shared/utils';
import Card from '../components/Card';
import Badge from '../components/Badge';
import Icon from '@shared/Icon';
import EmptyState from '../components/EmptyState';
import Drawer from '../components/Drawer';

const CLAIM_TYPES = [
  { key: 'Claimed',               label: 'Formal claim (credit or replacement requested)' },
  { key: 'Returns',               label: 'Return of goods' },
  { key: 'Rejected (Out of Spec)',label: 'Rejected at inspection (out of spec)' },
  { key: 'Information Only',      label: 'For information only — no credit requested' },
];

const REASONS = {
  'Quality / Disease': ['Botrytis','Dehydration','Petal blackening / falling','Advanced cut stage (too open)','Tight cut stage (too closed)','Small head size','Powdery mildew','Other disease / disorder'],
  'Physical Damage':   ['Bruises / pressure damage','Broken / bent stems','Leaf blackening or yellowing','Broken heads'],
  'Wrong Specification':['Wrong variety','Wrong length','Wrong mix / product','Missing or fewer stems','Wrong sleeve / mislabelled','Wrong bunch rate'],
  'Supply & Delivery': ['Late delivery','Over supply','Order cancellation','Wrong drop point'],
  'Invoice / Commercial':['Wrong pricing','Invoice error or missing'],
  'Pest / Regulatory': ['Live pest found (Thrips, Helicoverpa etc.)','KEPHIS / PHYTO rejection'],
};

const LENGTHS = ['40','42','50','52','60','62','70','72','80'];

const STEPS = ['Shipment','Affected varieties','Notes','Review & submit'];

const DEFAULT_LINE = () => ({ id: Date.now() + Math.random(), variety:'', length:'', recv:'', claimed:'', price:'', category:'', reason:'', detail:'' });

export default function Claims() {
  const [view, setView] = useState('list'); // list | new
  const [step, setStep] = useState(0);
  const [shipment, setShipment] = useState({ invoice:'', consignment:'', shipdate:'', po:'', location:'', claimtype:'' });
  const [lines, setLines] = useState([DEFAULT_LINE()]);
  const [notes, setNotes] = useState('');
  const [submitErr, setSubmitErr] = useState(null);
  const [submitOk, setSubmitOk] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const { ctx, data, loadList, loadDetail, detail, setDetail, submitClaim } = useStore();

  useEffect(() => { if (data.claims.rows == null) loadList('claims'); }, []);

  function totalStems(){ return lines.reduce((a,l)=>a+(parseInt(l.claimed)||0),0); }
  function totalCost(){ return lines.reduce((a,l)=>a+((parseFloat(l.claimed)||0)*(parseFloat(l.price)||0)),0); }

  function startNew(){ setView('new'); setStep(0); setShipment({ invoice:'', consignment:'', shipdate:'', po:'', location:'', claimtype:'' }); setLines([DEFAULT_LINE()]); setNotes(''); setSubmitErr(null); setSubmitOk(null); }

  function validateShipment(){
    if (!shipment.invoice || !shipment.shipdate || !shipment.location || !shipment.claimtype) return 'Please complete invoice, shipment date, location, and claim type.';
    return null;
  }
  function validateLines(){
    for (const l of lines) {
      if (!l.variety || !l.length || !l.claimed || !l.category || !l.reason) return 'Each variety row needs variety, length, claimed stems, category, and reason.';
    }
    return null;
  }

  function next(){
    setSubmitErr(null);
    if (step === 0) { const e = validateShipment(); if (e) return setSubmitErr(e); }
    if (step === 1) { const e = validateLines(); if (e) return setSubmitErr(e); }
    setStep(step + 1);
  }
  function back(){ setStep(Math.max(0, step - 1)); setSubmitErr(null); }

  async function submit(){
    setSubmitting(true); setSubmitErr(null);
    try {
      const payload = {
        invoice_number: shipment.invoice,
        consignment_number: shipment.consignment,
        po_number: shipment.po,
        shipment_date: shipment.shipdate,
        control_point: shipment.location,
        claim_type: shipment.claimtype,
        total_stems_claimed: totalStems(),
        total_claim_cost: totalCost(),
        currency: ctx?.currency || 'USD',
        additional_description: notes,
        contact_name: ctx?.full_name,
        contact_email: ctx?.user,
        claim_items: lines.map((l) => ({
          variety: l.variety,
          stem_length: l.length,
          stems_received: parseInt(l.recv) || 0,
          stems_claimed: parseInt(l.claimed) || 0,
          price_per_stem: parseFloat(l.price) || 0,
          claim_cost: (parseFloat(l.claimed)||0) * (parseFloat(l.price)||0),
          reason_category: l.category,
          reason: l.reason,
          description: l.detail,
        })),
      };
      const r = await submitClaim(payload);
      setSubmitOk({ name: r?.name || 'CF-—', status: r?.status || 'Submitted' });
      loadList('claims');
    } catch (e) {
      setSubmitErr(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (submitOk) return (
    <Card>
      <div className="success-wrap">
        <div className="success-mark"><Icon name="check" /></div>
        <div className="success-title">Your claim has been received</div>
        <div className="success-text">
          We've logged your claim and our team will respond within one business day.
          Track the status here in your portal at any time.
        </div>
        <div className="ref-box">
          <div className="ref-label">Reference</div>
          <div className="ref-number">{submitOk.name}</div>
          <div className="ref-hint">Quote in all follow-up</div>
        </div>
        <div className="action-row" style={{ justifyContent:'center', borderTop:'none' }}>
          <button className="btn btn-secondary" onClick={() => { setSubmitOk(null); setView('list'); }}>
            <Icon name="list" /> Back to claims
          </button>
          <button className="btn btn-primary" onClick={() => { setSubmitOk(null); startNew(); }}>
            <Icon name="add" /> File another
          </button>
        </div>
      </div>
    </Card>
  );

  if (view === 'list') return <ClaimsList rows={data.claims.rows} err={data.claims.err} onNew={startNew} loadDetail={loadDetail} detail={detail} setDetail={setDetail} />;

  // Wizard view
  return (
    <>
      <div className="step-nav">
        {STEPS.map((label, i) => (
          <div key={i} className="sn-step">
            <div className={`sn-circle ${i < step ? 'done' : i === step ? 'active' : 'pending'}`}>
              {i < step ? '✓' : i + 1}
            </div>
            <div className={`sn-label ${i < step ? 'done' : i === step ? 'active' : 'pending'}`}>{label}</div>
            {i < STEPS.length - 1 && <div className="sn-line" />}
          </div>
        ))}
      </div>

      {step === 0 && (
        <Card title="Shipment details" sub="Tell us about the consignment">
          <div className="grid2">
            <div className="fg"><label className="fl">Invoice / consignment ref<span className="req">*</span></label>
              <input className="fc" placeholder="e.g. PO 187016" value={shipment.invoice} onChange={(e) => setShipment({...shipment, invoice: e.target.value})} /></div>
            <div className="fg"><label className="fl">Consignment number</label>
              <input className="fc" placeholder="e.g. 54721" value={shipment.consignment} onChange={(e) => setShipment({...shipment, consignment: e.target.value})} /></div>
          </div>
          <div className="grid2">
            <div className="fg"><label className="fl">Shipment date<span className="req">*</span></label>
              <input className="fc" type="date" value={shipment.shipdate} onChange={(e) => setShipment({...shipment, shipdate: e.target.value})} /></div>
            <div className="fg"><label className="fl">Your PO number</label>
              <input className="fc" placeholder="Optional" value={shipment.po} onChange={(e) => setShipment({...shipment, po: e.target.value})} /></div>
          </div>
          <div className="grid2">
            <div className="fg"><label className="fl">Where was the issue found<span className="req">*</span></label>
              <select className="fc" value={shipment.location} onChange={(e) => setShipment({...shipment, location: e.target.value})}>
                <option value="">Select…</option>
                <option>Airport</option><option>Market</option><option>KEPHIS</option><option>Other</option>
              </select></div>
            <div className="fg"><label className="fl">Claim type<span className="req">*</span></label>
              <select className="fc" value={shipment.claimtype} onChange={(e) => setShipment({...shipment, claimtype: e.target.value})}>
                <option value="">Select…</option>
                {CLAIM_TYPES.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
              </select></div>
          </div>
          {submitErr && <div className="alert alert-err"><Icon name="error" />{submitErr}</div>}
          <div className="action-row">
            <button className="btn btn-secondary" onClick={() => setView('list')}><Icon name="arrow_back" /> Cancel</button>
            <div className="spacer" />
            <button className="btn btn-primary" onClick={next}>Continue <Icon name="arrow_forward" /></button>
          </div>
        </Card>
      )}

      {step === 1 && (
        <Card title="Affected varieties" sub="One row per variety">
          {lines.map((l, i) => (
            <div className="claim-line" key={l.id}>
              <div className="cl-head">
                <span className="cl-badge">Variety {i+1}</span>
                {lines.length > 1 && <button className="cl-remove" onClick={() => setLines(lines.filter((x) => x.id !== l.id))}><Icon name="close" /></button>}
              </div>
              <div className="grid2">
                <div className="fg"><label className="fl">Variety name<span className="req">*</span></label>
                  <input className="fc" placeholder="e.g. Julieta Cerise" value={l.variety} onChange={(e) => updateLine(l.id, 'variety', e.target.value)} /></div>
                <div className="fg"><label className="fl">Stem length<span className="req">*</span></label>
                  <select className="fc" value={l.length} onChange={(e) => updateLine(l.id, 'length', e.target.value)}>
                    <option value="">Select…</option>
                    {LENGTHS.map((x) => <option key={x} value={x}>{x} cm</option>)}
                  </select></div>
              </div>
              <div className="grid3">
                <div className="fg"><label className="fl">Stems received</label>
                  <input className="fc" type="number" min={0} value={l.recv} onChange={(e) => updateLine(l.id, 'recv', e.target.value)} /></div>
                <div className="fg"><label className="fl">Stems claimed<span className="req">*</span></label>
                  <input className="fc" type="number" min={0} value={l.claimed} onChange={(e) => updateLine(l.id, 'claimed', e.target.value)} /></div>
                <div className="fg"><label className="fl">Price per stem</label>
                  <input className="fc" type="number" step="0.001" min={0} value={l.price} onChange={(e) => updateLine(l.id, 'price', e.target.value)} /></div>
              </div>
              <div className="grid2">
                <div className="fg"><label className="fl">Reason category<span className="req">*</span></label>
                  <select className="fc" value={l.category} onChange={(e) => { updateLine(l.id, 'category', e.target.value); updateLine(l.id, 'reason', ''); }}>
                    <option value="">Select category…</option>
                    {Object.keys(REASONS).map((c) => <option key={c} value={c}>{c}</option>)}
                  </select></div>
                <div className="fg"><label className="fl">Specific reason<span className="req">*</span></label>
                  <select className="fc" value={l.reason} onChange={(e) => updateLine(l.id, 'reason', e.target.value)} disabled={!l.category}>
                    <option value="">Select reason…</option>
                    {(REASONS[l.category] || []).map((r) => <option key={r} value={r}>{r}</option>)}
                  </select></div>
              </div>
              <div className="fg"><label className="fl">Additional detail</label>
                <input className="fc" placeholder="Optional" value={l.detail} onChange={(e) => updateLine(l.id, 'detail', e.target.value)} /></div>
            </div>
          ))}
          <button className="add-line-btn" onClick={() => setLines([...lines, DEFAULT_LINE()])}>
            <Icon name="add" /> Add another variety
          </button>
          {submitErr && <div className="alert alert-err"><Icon name="error" />{submitErr}</div>}
          <div className="action-row">
            <button className="btn btn-secondary" onClick={back}><Icon name="arrow_back" /> Back</button>
            <div className="spacer" />
            <span className="help">{lines.length} row{lines.length===1?'':'s'} · {totalStems()} stems · {fmtMoney(totalCost(), ctx?.currency)}</span>
            <button className="btn btn-primary" onClick={next}>Continue <Icon name="arrow_forward" /></button>
          </div>
        </Card>
      )}

      {step === 2 && (
        <Card title="Notes" sub="Anything else we should know? (optional)">
          <div className="fg">
            <label className="fl">Description</label>
            <textarea className="fc" rows={6} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Describe what you received vs what was expected, the impact on your customers, photos sent separately, etc." />
            <div className="fg-help">You can attach evidence after submission by replying to the confirmation email.</div>
          </div>
          <div className="action-row">
            <button className="btn btn-secondary" onClick={back}><Icon name="arrow_back" /> Back</button>
            <div className="spacer" />
            <button className="btn btn-primary" onClick={next}>Review <Icon name="arrow_forward" /></button>
          </div>
        </Card>
      )}

      {step === 3 && (
        <Card title="Review & submit" sub="Make sure everything looks right">
          <div className="summary-row"><span className="sr-label">Invoice</span><span className="sr-value mono">{shipment.invoice}</span></div>
          {shipment.consignment && <div className="summary-row"><span className="sr-label">Consignment</span><span className="sr-value mono">{shipment.consignment}</span></div>}
          <div className="summary-row"><span className="sr-label">Shipment date</span><span className="sr-value">{shipment.shipdate}</span></div>
          {shipment.po && <div className="summary-row"><span className="sr-label">Your PO</span><span className="sr-value mono">{shipment.po}</span></div>}
          <div className="summary-row"><span className="sr-label">Where found</span><span className="sr-value">{shipment.location}</span></div>
          <div className="summary-row"><span className="sr-label">Claim type</span><span className="sr-value">{CLAIM_TYPES.find((t) => t.key === shipment.claimtype)?.label}</span></div>

          <div className="divider" />
          <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 10 }}>Varieties ({lines.length})</div>
          {lines.map((l) => (
            <div className="summary-row" key={l.id}>
              <span className="sr-label" style={{ minWidth: 200, fontFamily:'inherit', textTransform:'none', letterSpacing:0, fontSize: 13 }}>
                {l.variety} · {l.length}cm
                <div style={{ fontSize:11, color:'var(--text-3)', marginTop:2 }}>{l.reason}{l.detail ? ` — ${l.detail}` : ''}</div>
              </span>
              <span className="sr-value">{l.claimed} stems · {fmtMoney((parseFloat(l.claimed)||0)*(parseFloat(l.price)||0), ctx?.currency)}</span>
            </div>
          ))}
          <div className="summary-row" style={{ borderTop: '1.5px solid var(--text)', paddingTop: 10, marginTop: 4 }}>
            <span className="sr-label" style={{ fontWeight: 600, color: 'var(--text)' }}>Total</span>
            <span className="sr-value" style={{ fontSize: 15 }}>{totalStems()} stems · {fmtMoney(totalCost(), ctx?.currency)}</span>
          </div>
          {notes && <><div className="divider" /><div style={{ whiteSpace: 'pre-wrap', fontSize: 13, color: 'var(--text-2)' }}>{notes}</div></>}
          {submitErr && <div className="alert alert-err"><Icon name="error" />{submitErr}</div>}
          <div className="action-row">
            <button className="btn btn-secondary" onClick={back}><Icon name="arrow_back" /> Edit</button>
            <div className="spacer" />
            <button className="btn btn-primary" onClick={submit} disabled={submitting}>
              <Icon name="send" />{submitting ? 'Submitting…' : 'Submit claim'}
            </button>
          </div>
        </Card>
      )}
    </>
  );

  function updateLine(id, field, value){
    setLines(lines.map((l) => l.id === id ? { ...l, [field]: value } : l));
  }
}

function ClaimsList({ rows, err, onNew, loadDetail, detail, setDetail }) {
  if (rows == null) return <div className="loading">Loading claims</div>;
  if (err) return <div className="alert alert-err"><Icon name="error" />{err}</div>;

  return (
    <>
      <Card
        title="Your claims"
        sub={`${rows.length} record${rows.length === 1 ? '' : 's'}`}
        action={<button className="btn btn-primary" onClick={onNew}><Icon name="add" /> File a claim</button>}
        flush
      >
        {rows.length ? (
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr><th>Ref</th><th>Date</th><th>Type</th><th>Invoice</th><th>Status</th><th className="right">Stems</th><th className="right">Cost</th></tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.name} className="clickable" onClick={() => loadDetail('claims', r.name)}>
                    <td className="id">{r.name}</td>
                    <td className="id">{fmtDate(r.feedback_date)}</td>
                    <td>{r.feedback_type || '—'}</td>
                    <td className="id">{r.invoice_number || '—'}</td>
                    <td><Badge value={r.status} /></td>
                    <td className="num">{fmt(r.total_stems_claimed)}</td>
                    <td className="num">{r.total_claim_cost ? fmtMoney(r.total_claim_cost) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState icon="check_circle" title="No claims on file" hint="If something went wrong with a shipment, file a claim above and we'll respond within 24 hours." />
        )}
      </Card>

      <Drawer open={detail?.kind === 'claims'} title={detail?.name} sub="Claim" onClose={() => setDetail(null)}>
        {detail?.loading && <div className="loading">Loading</div>}
        {detail?.err && <div className="alert alert-err"><Icon name="error" />{detail.err}</div>}
        {detail?.doc && <ClaimDoc d={detail.doc} />}
      </Drawer>
    </>
  );
}

function ClaimDoc({ d }) {
  return (
    <>
      <div className="summary-row"><span className="sr-label">Status</span><span className="sr-value"><Badge value={d.status} /></span></div>
      <div className="summary-row"><span className="sr-label">Type</span><span className="sr-value">{d.feedback_type}</span></div>
      <div className="summary-row"><span className="sr-label">Filed</span><span className="sr-value">{fmtDate(d.feedback_date)}</span></div>
      {d.invoice_number && <div className="summary-row"><span className="sr-label">Invoice</span><span className="sr-value mono">{d.invoice_number}</span></div>}
      {d.consignment_number && <div className="summary-row"><span className="sr-label">Consignment</span><span className="sr-value mono">{d.consignment_number}</span></div>}
      {d.claim_type && <div className="summary-row"><span className="sr-label">Claim type</span><span className="sr-value">{d.claim_type}</span></div>}
      {d.total_stems_claimed != null && <div className="summary-row"><span className="sr-label">Stems</span><span className="sr-value">{fmt(d.total_stems_claimed)}</span></div>}
      {d.total_claim_cost != null && <div className="summary-row"><span className="sr-label">Claim cost</span><span className="sr-value">{fmtMoney(d.total_claim_cost, d.currency)}</span></div>}

      {Array.isArray(d.claim_items) && d.claim_items.length > 0 && (
        <>
          <div className="divider" />
          <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 8 }}>Varieties</div>
          {d.claim_items.map((it, i) => (
            <div className="claim-line" key={i} style={{ background: 'var(--surface)' }}>
              <div className="cl-head">
                <span className="cl-badge">{it.variety} · {it.stem_length}cm</span>
              </div>
              <div style={{ fontSize: 12.5, color: 'var(--text-2)' }}>
                <strong>{fmt(it.stems_claimed)}</strong> stems claimed of <strong>{fmt(it.stems_received)}</strong> received — {it.reason || '—'}
              </div>
              {it.description && <div style={{ fontSize: 11.5, color: 'var(--text-3)', marginTop: 4 }}>{it.description}</div>}
            </div>
          ))}
        </>
      )}

      {d.additional_description && (
        <>
          <div className="divider" />
          <div style={{ whiteSpace: 'pre-wrap', fontSize: 13, color: 'var(--text-2)' }}>{d.additional_description}</div>
        </>
      )}
    </>
  );
}
