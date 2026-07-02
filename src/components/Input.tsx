import type { InputHTMLAttributes } from 'react';

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
};

export function Input({ label, className = '', ...props }: Props) {
  return (
    <label className="field">
      {label ? <span className="field-label">{label}</span> : null}
      <input className={className} {...props} />
    </label>
  );
}
