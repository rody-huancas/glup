import { ACTIVITY_RANGES, ACTIVITY_TEXTS } from '@/modules/home/constants/activity';
import type { ActivityRange } from '@/modules/home/types/activityRange';
import { cx } from '@/shared/utils/classNames';

interface ActivityRangePickerProps {
  range    : ActivityRange;
  onChange : (range: ActivityRange) => void;
}

// «Esta semana / Últimas 4 semanas / Últimos 6 meses»: one choice, the arrows move it.
export const ActivityRangePicker = ({ range, onChange }: ActivityRangePickerProps) => {
  const step = (by: number) => onChange(ACTIVITY_RANGES[(ACTIVITY_RANGES.indexOf(range) + by + ACTIVITY_RANGES.length) % ACTIVITY_RANGES.length]);

  return (
    <div
      role="radiogroup"
      aria-label={ACTIVITY_TEXTS.rangeName}
      onKeyDown={(event) => {
        if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
        event.preventDefault();
        step(event.key === 'ArrowRight' ? 1 : -1);
      }}
      className="flex shrink-0 rounded-full border border-line bg-bg p-0.5"
    >
      {ACTIVITY_RANGES.map((option) => (
        <button
          key={option}
          type="button"
          role="radio"
          aria-checked={option === range}
          tabIndex={option === range ? 0 : -1}
          onClick={() => onChange(option)}
          ref={(button) => {
            if (button && option === range && button.parentElement?.contains(document.activeElement)) button.focus();
          }}
          className={cx(
            'h-7 cursor-pointer rounded-full px-2.5 text-[11px] font-semibold whitespace-nowrap outline-none transition-colors focus-visible:outline-2 focus-visible:outline-lilac',
            option === range ? 'bg-raised text-text' : 'text-muted hover:text-text',
          )}
        >
          {ACTIVITY_TEXTS.ranges[option]}
        </button>
      ))}
    </div>
  );
};
