import { useEffect, useState } from 'react';
import { useStore } from '../store';
import Icon from '../components/Icon';

export default function Confirmation() {
  const { confirmation, setView } = useStore();
  const [secs, setSecs] = useState(5);

  useEffect(() => {
    const t = setInterval(() => {
      setSecs((s) => {
        if (s <= 1) {
          window.location.href = '/customer-portal';
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="success-card">
      <div className="success-mark"><Icon name="check" /></div>
      <div className="success-title">Request received</div>
      <div className="success-text">
        Thank you. Your request has been sent to our sales team. They'll review,
        confirm availability and pricing, and come back within one business day.
      </div>
      <div className="ref-box">
        <div className="ref-label">Quotation reference</div>
        <div className="ref-number">{confirmation?.name || '—'}</div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 10 }}>
        <a className="btn btn-secondary" onClick={() => setView('catalog')}>
          <Icon name="shopping_bag" />Continue browsing
        </a>
        <a className="btn btn-primary" href="/customer-portal">
          <Icon name="receipt_long" />View in my portal
        </a>
      </div>
      <div className="redirect-hint">
        Redirecting to your portal in {secs}s…
      </div>
    </div>
  );
}
