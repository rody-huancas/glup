import type { UsageLevel } from '@/modules/performance/types/usageLevel';
import { cx } from '@/shared/utils/classNames';

interface UsageMeterProps {
  label   : string;
  // 0 to 100; null when Windows does not tell it.
  percent : number | null;
  level   : UsageLevel;
  phrase  : string;
  detail? : string;
}

const BAR_TONES: Record<UsageLevel, string> = {
  calm    : 'bg-mint',
  working : 'bg-mint',
  busy    : 'bg-warn',
  full    : 'bg-danger',
};

// A bar and a phrase: how much, and what it means.
export const UsageMeter = ({ label, percent, level, phrase, detail }: UsageMeterProps) => {
  const value = percent === null ? null : Math.round(Math.min(Math.max(percent, 0), 100));

  return (
    <div className="flex flex-col gap-1.5 rounded-[14px] border border-line bg-raised p-3">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[12px] font-semibold text-muted">{label}</span>
        {value !== null && <span className="text-[13px] font-semibold tabular-nums text-text">{value} %</span>}
      </div>
      <div
        role="meter"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={value ?? undefined}
        aria-valuetext={phrase}
        className="relative h-1.5 w-full overflow-hidden rounded-full bg-bg"
      >
        {value !== null && (
          <div className={cx('absolute inset-y-0 left-0 rounded-full transition-[width] duration-500 motion-reduce:transition-none', BAR_TONES[level])} style={{ width: `${value}%` }} />
        )}
      </div>
      <p className="text-[12px] leading-snug text-text">{phrase}</p>
      {detail && <p className="text-[11px] text-muted">{detail}</p>}
    </div>
  );
};
