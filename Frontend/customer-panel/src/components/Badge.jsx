import { statusClass } from '@shared/utils';
export default function Badge({ value, cls }) {
  if (!value) return <span className="bdg bdg-other">—</span>;
  return <span className={`bdg ${cls || statusClass(value)}`}>{value}</span>;
}
