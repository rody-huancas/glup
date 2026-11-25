import { useEffect, useState } from 'react';
import { TRIM_TEXTS } from '@/modules/media/constants/texts';
import { formatTime, parseTime } from '@/modules/media/utils/time';
import { cx } from '@/shared/utils/classNames';

interface TrimTimeFieldProps {
  label    : string;
  value    : number;
  onChange : (seconds: number) => void;
}

// A time to type (1:05.3); it applies on Enter or when the field is left, and says so if it is not a time.
export const TrimTimeField = ({ label, value, onChange }: TrimTimeFieldProps) => {
  const [text, setText] = useState(formatTime(value));
  const [bad, setBad]   = useState(false);

  useEffect(() => {
    setText(formatTime(value));
    setBad(false);
  }, [value]);

  const apply = () => {
    const seconds = parseTime(text);
    if (seconds === null) return setBad(true);
    onChange(seconds);
  };

  return (
    <label className="flex flex-col gap-1 text-[11px] font-semibold text-muted">
      {label}
      <input
        value={text}
        onChange={(event) => setText(event.target.value)}
        onBlur={apply}
        onKeyDown={(event) => event.key === 'Enter' && apply()}
        inputMode="decimal"
        aria-label={TRIM_TEXTS.timeField(label)}
        aria-invalid={bad}
        title={bad ? TRIM_TEXTS.badTime : undefined}
        className={cx('h-8 w-24 rounded-control border bg-raised px-2 font-mono text-[13px] text-text tabular-nums outline-none focus:border-lilac', bad ? 'border-danger' : 'border-line-strong')}
      />
    </label>
  );
};
