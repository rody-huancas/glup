import { cx } from '@/shared/utils/classNames';

interface ChoiceButtonProps {
  label     : string;
  hint      : string;
  onClick   : () => void;
  // The last one chosen, remembered in settings.
  selected? : boolean;
  disabled? : boolean;
}

// Two-line option (label and hint), like the format buttons.
export const ChoiceButton = ({ label, hint, onClick, selected = false, disabled = false }: ChoiceButtonProps) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    aria-pressed={selected}
    className={cx(
      'flex h-[52px] min-w-0 cursor-pointer flex-col items-start justify-center rounded-control border bg-raised px-3 text-left transition-colors hover:bg-line disabled:cursor-not-allowed disabled:opacity-50',
      selected ? 'border-lilac' : 'border-line-strong',
    )}
  >
  {/* className={cx('flex h-[52px] min-w-0 cursor-pointer flex-col items-start justify-center rounded-control border border-line-strong bg-raised px-3 text-left transition-colors hover:bg-line')} */}
    <span className="text-[13px] font-semibold text-text">{label}</span>
    <span className="w-full truncate text-[11px] text-muted">{hint}</span>
  </button>
);
