import { cx } from '@/shared/utils/classNames';

interface SortModeOptionProps {
  label    : string;
  hint     : string;
  selected : boolean;
  disabled : boolean;
  onChoose : () => void;
}

// One way of sorting (a radio of its group).
export const SortModeOption = ({ label, hint, selected, disabled, onChoose }: SortModeOptionProps) => (
  <button
    type="button"
    role="radio"
    aria-checked={selected}
    disabled={disabled}
    onClick={onChoose}
    className={cx(
      'flex min-w-0 flex-1 cursor-pointer flex-col rounded-control border px-3 py-2 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60',
      selected ? 'border-mint bg-raised' : 'border-line-strong bg-bg hover:border-line-dashed',
    )}
  >
    <span className={cx('text-[12px] font-semibold', selected ? 'text-mint' : 'text-text')}>{label}</span>
    <span className="truncate text-[11px] leading-4 text-muted">{hint}</span>
  </button>
);
