import { cx } from '@/shared/utils/classNames';

interface SwitchProps {
  label     : string;
  checked   : boolean;
  disabled? : boolean;
  onChange  : (checked: boolean) => void;
}

export const Switch = ({ label, checked, disabled = false, onChange }: SwitchProps) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    disabled={disabled}
    onClick={() => onChange(!checked)}
    className={cx('flex w-fit items-center gap-2 text-[11px] font-semibold', disabled ? 'cursor-default opacity-60' : 'cursor-pointer')}
  >
    <span className={cx('relative h-4 w-7 shrink-0 rounded-full transition-colors', checked ? 'bg-mint' : 'bg-line-strong')}>
      <span
        className={cx(
          'absolute top-0.5 size-3 rounded-full bg-text transition-transform',
          checked ? 'translate-x-3.5' : 'translate-x-0.5',
        )}
      />
    </span>
    <span className={checked ? 'text-text' : 'text-muted'}>{label}</span>
  </button>
);
