import { CLEANUP_TEXTS } from '@/modules/cleanup/constants/texts';
import type { DiskSpace } from '@/modules/cleanup/interfaces/diskSpace';
import { isLowSpace, usedShare } from '@/modules/cleanup/utils/diskUsage';
import { formatFileSize } from '@/modules/actions/utils/fileSize';
import { Skeleton } from '@/shared/components/Skeleton';
import { cx } from '@/shared/utils/classNames';

interface DiskUsageBarProps {
  space  : DiskSpace | null;
  failed : boolean;
}

// The system disk: used in lilac over the free part; under 10% free, both turn to the warning tone.
export const DiskUsageBar = ({ space, failed }: DiskUsageBarProps) => {
  if (!space) {
    return failed ? <p className="text-[13px] text-muted">{CLEANUP_TEXTS.diskError}</p> : <Skeleton className="h-[30px] w-full" />;
  }

  const low  = isLowSpace(space);
  const used = Math.round(usedShare(space) * 100);

  return (
    <div>
      <p className={cx('text-[13px] font-semibold', low ? 'text-warn' : 'text-text')}>
        {CLEANUP_TEXTS.disk(formatFileSize(space.free), formatFileSize(space.total))}
      </p>
      <div
        role="meter"
        aria-label={CLEANUP_TEXTS.diskLabel}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={used}
        className="mt-2 h-2 w-full overflow-hidden rounded-full bg-raised"
      >
        <div className={cx('h-full', low ? 'bg-warn' : 'bg-lilac')} style={{ width: `${used}%` }} />
      </div>
    </div>
  );
};

// Before: inside a card.
// <Card className="px-4 py-3.5"> … <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-bg"> …
