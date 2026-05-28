import Icon from './Icon';
export default function EmptyState({ icon, title, hint }) {
  return (
    <div className="empty">
      {icon && <Icon name={icon} />}
      <div>{title}</div>
      {hint && <div style={{ marginTop: 4, fontSize: 10.5 }}>{hint}</div>}
    </div>
  );
}
