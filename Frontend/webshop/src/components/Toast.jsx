import { useStore } from '../store';
import Icon from '@shared/Icon';

export default function Toast() {
  const { toast, clearToast } = useStore();
  if (!toast) return null;
  const icon = toast.kind === 'err' ? 'error' : toast.kind === 'ok' ? 'check_circle' : 'info';
  return (
    <div className={`toast ${toast.kind || ''}`} onClick={clearToast}>
      <Icon name={icon} />
      <span>{toast.message}</span>
    </div>
  );
}
