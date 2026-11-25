import type { ReactNode } from 'react';
import { cx } from '@/shared/utils/classNames';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ink' | 'media';

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
  // On a mint card (Inicio): the ink as the fill, the mint as the text.
  ink       : 'bg-mint-ink text-mint hover:brightness-150',
  // The screens of Audio y video: the main action in the family's yellow.
  media     : 'bg-fam-media text-fam-media-ink hover:brightness-105',
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
