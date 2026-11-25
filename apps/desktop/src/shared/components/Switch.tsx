import { useId } from 'react';
import type { Accent } from '@/shared/types/accent';
import { cx } from '@/shared/utils/classNames';

interface SwitchProps {
  label     : string;
  checked   : boolean;
  // A second, softer line under the label.
  hint?     : string;
  disabled? : boolean;
  // The colour when it is on: Glup's mint, or the family of the screen.
  accent?   : Accent;
  onChange  : (checked: boolean) => void;
}

const ON: Record<Accent, { track: string; ring: string }> = {
  mint   : { track: 'bg-mint', ring: 'group-focus-visible:outline-mint' },
  media  : { track: 'bg-fam-media', ring: 'group-focus-visible:outline-fam-media' },
  images : { track: 'bg-fam-images', ring: 'group-focus-visible:outline-fam-images' },
  text   : { track: 'bg-fam-text', ring: 'group-focus-visible:outline-fam-text' },
  pc     : { track: 'bg-fam-pc', ring: 'group-focus-visible:outline-fam-pc' },
};

// The whole row (track and texts) is one real switch button: Space and Enter toggle it natively.
export const Switch = ({ label, checked, hint, disabled = false, accent = 'mint', onChange }: SwitchProps) => {
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
          'group-focus-visible:outline-2 group-focus-visible:outline-offset-2',
          ON[accent].ring,
          checked ? ON[accent].track : 'bg-line-strong',
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
