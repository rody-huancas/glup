import type { Accent } from '@/shared/types/accent';
import { cx } from '@/shared/utils/classNames';

interface SaveOptionButtonProps {
  label    : string;
  title?   : string;
  active   : boolean;
  disabled : boolean;
  onClick  : () => void;
  accent?  : Accent;
}

const ACTIVE: Record<Accent, string> = {
  mint  : 'border-mint/40 bg-[#24302E] text-mint',
  media : 'border-fam-media/40 bg-fam-media-dark text-fam-media',
};

export const SaveOptionButton = ({ label, title, active, disabled, onClick, accent = 'mint' }: SaveOptionButtonProps) => (
  <button
    type="button"
    title={title}
    disabled={disabled}
    onClick={onClick}
    className={cx(
      'h-7 min-w-0 max-w-[150px] shrink truncate rounded-full border px-2.5 text-[11px] font-semibold transition-colors',
      active ? ACTIVE[accent] : 'border-line text-muted',
      disabled ? 'cursor-default opacity-60' : !active && 'cursor-pointer hover:border-line-strong hover:text-text',
    )}
  >
    {label}
  </button>
);
