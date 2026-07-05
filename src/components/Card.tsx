import type { CSSProperties, ReactNode } from 'react';

type Props = {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
};

export function Card({ children, className = '', style }: Props) {
  return <div className={`card ${className}`.trim()} style={style}>{children}</div>;
}
