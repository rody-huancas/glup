import type { ReactNode } from 'react';
import { cx } from '@/shared/utils/classNames';

export type ButtonVariant = 'primary' | 'secondary' | 'danger';

interface ButtonProps {
  children   : ReactNode;
  onClick    : () => void;
  variant?   : ButtonVariant;
  disabled?  : boolean;
  className? : string;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary   : 'bg-mint text-mint-ink hover:brightness-105',
  secondary : 'border border-line-strong bg-raised text-text hover:bg-line',
  // Removing something: coral, filled on hover.
  danger    : 'border border-danger/40 bg-danger-soft text-danger hover:bg-danger hover:text-danger-ink',
};

export const Button = ({ children, onClick, variant = 'primary', disabled = false, className }: ButtonProps) => (
  <button
    type="button"
    disabled={disabled}
    onClick={onClick}
    className={cx(
      'h-11 cursor-pointer truncate rounded-control px-4 text-[13px] font-semibold transition-colors',
      VARIANT_CLASSES[variant],
      className,
    )}
  >
    {children}
  </button>
);
