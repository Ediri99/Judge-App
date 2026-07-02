import type { ReactNode } from 'react';

type Props = {
  children: ReactNode;
};

export function PhoneFrame({ children }: Props) {
  return <div className="phone-frame">{children}</div>;
}
