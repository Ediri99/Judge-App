import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'default' | 'primary' | 'ghost';
  children: ReactNode;
};

export function Button({ variant = 'default', className = '', children, ...props }: Props) {
  const base = 'btn';
  const variantClass = {
    default: 'btn-default',
    primary: 'btn-primary',
    ghost: 'btn-ghost',
  }[variant];

  return (
    <button className={`${base} ${variantClass} ${className}`.trim()} {...props}>
      {children}
    </button>
  );
}
