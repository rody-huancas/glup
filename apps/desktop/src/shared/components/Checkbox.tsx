import { useEffect, useRef } from 'react';
import { cx } from '@/shared/utils/classNames';

interface CheckboxProps {
  label          : string;
  checked        : boolean;
  // Some, not all, of what it stands for is marked.
  indeterminate? : boolean;
  disabled?      : boolean;
  onChange       : (checked: boolean) => void;
}

// A real checkbox (keyboard and screen readers) drawn with the theme tokens; the label is for
// assistive technology, the visible text sits next to it.
export const Checkbox = ({ label, checked, indeterminate = false, disabled = false, onChange }: CheckboxProps) => {
  const ref = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate;
  }, [indeterminate]);

  return (
    <span className="relative flex size-4 shrink-0" onClick={(event) => event.stopPropagation()}>
      <input
        ref={ref}
        type="checkbox"
        aria-label={label}
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className={cx(
          'peer size-4 cursor-pointer appearance-none rounded-[5px] border border-line-strong bg-raised transition-colors',
          'checked:border-mint checked:bg-mint indeterminate:border-mint indeterminate:bg-mint',
          'disabled:cursor-not-allowed disabled:opacity-40',
        )}
      />
      <svg viewBox="0 0 16 16" aria-hidden="true" className="pointer-events-none absolute inset-0 hidden text-mint-ink peer-checked:block">
        <path d="M4 8.5l2.5 2.5L12 5.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <svg viewBox="0 0 16 16" aria-hidden="true" className="pointer-events-none absolute inset-0 hidden text-mint-ink peer-indeterminate:block">
        <path d="M4.5 8h7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    </span>
  );
};
