import type { ReactNode } from 'react';

type Props = {
  children: ReactNode;
  tone?: 'default' | 'gold';
};

export function Medal({ children, tone = 'default' }: Props) {
  return <span className={`medal ${tone === 'gold' ? 'gold' : ''}`}>{children}</span>;
}
