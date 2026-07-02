import type { SelectHTMLAttributes } from 'react';

type Props = SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string;
};

export function Select({ label, className = '', children, ...props }: Props) {
  return (
    <label className="field">
      {label ? <span className="field-label">{label}</span> : null}
      <select className={className} {...props}>
        {children}
      </select>
    </label>
  );
}
