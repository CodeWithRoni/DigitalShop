import { STATUS_COLOR, STATUS_LABEL } from '@/lib/utils';
export default function StatusBadge({ s }: { s: string }) {
  return <span className={`badge ${STATUS_COLOR[s] || ''}`}>{STATUS_LABEL[s] || s}</span>;
}
