type Props = {
  label?: string;
};

export function StatusBadge({ label = 'Pending' }: Props) {
  return <span className="status-badge">{label}</span>;
}
