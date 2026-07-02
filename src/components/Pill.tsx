import type { ReactNode } from 'react';

type Props = {
  children: ReactNode;
  tone?: 'default' | 'success' | 'warning';
};

export function Pill({ children, tone = 'default' }: Props) {
  return <span className={`pill ${tone}`}>{children}</span>;
}
