import type { ReactNode } from 'react';

type Props = {
  open: boolean;
  children: ReactNode;
};

export function Toast({ open, children }: Props) {
  return (
    <div className={`toast ${open ? 'show' : ''}`} role="status" aria-live="polite">
      {open ? children : null}
    </div>
  );
}
