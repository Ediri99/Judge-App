import type { ReactNode } from 'react';

type Props = {
  label: string;
  value: ReactNode;
  accent?: boolean;
};

export function MetricCard({ label, value, accent = false }: Props) {
  return (
    <div className={`metric ${accent ? 'accent' : ''}`}>
      <div className="metric-label">{label}</div>
      <div className="metric-value">{value}</div>
    </div>
  );
}
