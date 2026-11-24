import { cx } from '@/shared/utils/classNames';

interface GpuModeOptionProps {
  label    : string;
  hint     : string;
  selected : boolean;
  onChoose : () => void;
}

// One choice of "Usar la tarjeta de video" (a radio of its group).
export const GpuModeOption = ({ label, hint, selected, onChoose }: GpuModeOptionProps) => (
  <button
    type="button"
    role="radio"
    aria-checked={selected}
    onClick={onChoose}
    className={cx(
      'flex min-w-0 flex-1 cursor-pointer flex-col rounded-control border px-3 py-2 text-left transition-colors',
      selected ? 'border-mint bg-raised' : 'border-line-strong bg-bg hover:border-line-dashed',
    )}
  >
    <span className={cx('text-[12px] font-semibold', selected ? 'text-mint' : 'text-text')}>{label}</span>
    <span className="truncate text-[11px] leading-4 text-muted">{hint}</span>
  </button>
);
