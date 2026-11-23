import { useId } from 'react';
import { cx } from '@/shared/utils/classNames';

interface SwitchProps {
  label     : string;
  checked   : boolean;
  // A second, softer line under the label.
  hint?     : string;
  disabled? : boolean;
  onChange  : (checked: boolean) => void;
}

// The whole row (track and texts) is one real switch button: Space and Enter toggle it natively.
export const Switch = ({ label, checked, hint, disabled = false, onChange }: SwitchProps) => {
  const id = useId();

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-labelledby={`${id}-label`}
      aria-describedby={hint ? `${id}-hint` : undefined}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cx(
        'group flex w-fit gap-3 rounded-md text-left outline-none',
        hint ? 'items-start' : 'items-center',
        disabled ? 'cursor-default opacity-60' : 'cursor-pointer',
      )}
    >
      <span
        aria-hidden
        className={cx(
          'flex h-5 w-9 shrink-0 items-center rounded-full p-0.5 transition-colors duration-150 ease-out motion-reduce:transition-none',
          'group-focus-visible:outline-2 group-focus-visible:outline-offset-2 group-focus-visible:outline-mint',
          checked ? 'bg-mint' : 'bg-line-strong',
        )}
      >
        <span
          className={cx(
            'block size-4 rounded-full bg-text transition-transform duration-150 ease-out motion-reduce:transition-none',
            checked ? 'translate-x-4' : 'translate-x-0',
          )}
        />
      </span>
      <span className="flex min-w-0 flex-col">
        <span id={`${id}-label`} className={cx('text-[11px] leading-5 font-semibold', checked ? 'text-text' : 'text-muted')}>
          {label}
        </span>
        {hint && (
          <span id={`${id}-hint`} className="text-[11px] leading-4 text-muted">
            {hint}
          </span>
        )}
      </span>
    </button>
  );
};
