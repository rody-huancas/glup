import { cx } from '@/shared/utils/classNames';

interface OptionGroupProps<T extends string> {
  label    : string;
  options  : T[];
  labels   : Record<T, string>;
  value    : T;
  onChange : (value: T) => void;
}

// A row of small buttons where one is chosen (size, transparency, position…).
export const OptionGroup = <T extends string>({ label, options, labels, value, onChange }: OptionGroupProps<T>) => (
  <div role="radiogroup" aria-label={label} className="flex flex-col gap-1">
    <span className="text-[12px] font-semibold text-muted">{label}</span>
    <div className="flex flex-wrap gap-1.5">
      {options.map((option) => (
        <button
          key={option}
          type="button"
          role="radio"
          aria-checked={option === value}
          onClick={() => onChange(option)}
          className={cx(
            'h-8 cursor-pointer rounded-control border px-2.5 text-[12px] font-semibold transition-colors',
            option === value ? 'border-lilac bg-raised text-text' : 'border-line-strong text-muted hover:bg-raised hover:text-text',
          )}
        >
          {labels[option]}
        </button>
      ))}
    </div>
  </div>
);
