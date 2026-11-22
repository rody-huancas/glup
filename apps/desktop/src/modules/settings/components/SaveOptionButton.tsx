import { cx } from '@/shared/utils/classNames';

interface SaveOptionButtonProps {
  label    : string;
  title?   : string;
  active   : boolean;
  disabled : boolean;
  onClick  : () => void;
}

export const SaveOptionButton = ({ label, title, active, disabled, onClick }: SaveOptionButtonProps) => (
  <button
    type="button"
    title={title}
    disabled={disabled}
    onClick={onClick}
    className={cx(
      'h-7 min-w-0 max-w-[150px] shrink truncate rounded-full border px-2.5 text-[11px] font-semibold transition-colors',
      active ? 'border-mint/40 bg-[#24302E] text-mint' : 'border-line text-muted',
      disabled ? 'cursor-default opacity-60' : !active && 'cursor-pointer hover:border-line-strong hover:text-text',
    )}
  >
    {label}
  </button>
);
