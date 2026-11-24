import type { IslandPlacement } from '@/modules/dock/interfaces/islandPlacement';
import { getPillProgressStyle } from '@/modules/island/utils/islandStyles';
import { ProgressBar } from '@/shared/components/ProgressBar';
import { cx } from '@/shared/utils/classNames';

interface IslandPillProgressProps {
  visible   : boolean;
  // 0 to 1, or null for an indeterminate bar (one file).
  fraction  : number | null;
  placement : IslandPlacement;
}

// A thin mint bar along the pill's inner side while a task runs (the silhouette clips its corners).
export const IslandPillProgress = ({ visible, fraction, placement }: IslandPillProgressProps) => (
  <div
    aria-hidden
    className={cx('pointer-events-none absolute transition-opacity duration-200 [&>div]:h-[3px] [&>div]:rounded-none [&>div]:bg-transparent', visible ? 'opacity-100' : 'opacity-0')}
    style={getPillProgressStyle(placement)}
  >
    <ProgressBar value={fraction} />
  </div>
);
