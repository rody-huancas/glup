import { cx } from '@/shared/utils/classNames';

interface NumberFieldProps {
  label    : string;
  value    : string;
  invalid  : boolean;
  onChange : (value: string) => void;
}

// A short field for a whole number (a page, the first number).
export const NumberField = ({ label, value, invalid, onChange }: NumberFieldProps) => (
  <label className="flex items-center gap-2 text-[12px] font-semibold text-muted">
    {label}
    <input
      value={value}
      onChange={(event) => onChange(event.target.value)}
      inputMode="numeric"
      aria-invalid={invalid}
      className={cx(
        'h-8 w-14 rounded-control border bg-raised px-2 text-center text-[13px] font-normal text-text outline-none focus:border-lilac',
        invalid ? 'border-[#E58A9A]' : 'border-line-strong',
      )}
    />
  </label>
);
