import { cx } from '@/shared/utils/classNames';

interface ProgressBarProps {
  // 0 to 1; null shows an indeterminate bar.
  value: number | null;
}

// role="progressbar" without a value tells assistive tech it is indeterminate.
export const ProgressBar = ({ value }: ProgressBarProps) => (
  <div
    role="progressbar"
    aria-valuemin={0}
    aria-valuemax={100}
    aria-valuenow={value === null ? undefined : Math.round(Math.min(Math.max(value, 0), 1) * 100)}
    className="relative h-1.5 w-full overflow-hidden rounded-full bg-raised"
  >
    <div
      className={cx('absolute inset-y-0 left-0 rounded-full bg-mint', value === null ? 'animate-indeterminate w-1/3' : 'transition-[width] duration-300')}
      style={value === null ? undefined : { width: `${Math.round(Math.min(Math.max(value, 0), 1) * 100)}%` }}
    />
  </div>
);
