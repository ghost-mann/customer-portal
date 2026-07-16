import { brand } from '../brand';

export default function Footer() {
  return (
    <footer className="ws-footer">
      <div className="ws-footer-brand">
        <div className="ws-footer-name">{brand.name}</div>
        <div className="ws-footer-tag">{brand.tagline}</div>
      </div>
      <div className="ws-footer-note">© {brand.name}. Farm-fresh flowers.</div>
    </footer>
  );
}
