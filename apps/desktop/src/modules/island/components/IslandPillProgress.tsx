import { ISLAND_SHAPES } from '@/modules/island/constants/islandShape';
import { ProgressBar } from '@/shared/components/ProgressBar';
import { cx } from '@/shared/utils/classNames';

interface IslandPillProgressProps {
  visible  : boolean;
  // 0 to 1, or null for an indeterminate bar (one file).
  fraction : number | null;
}

const PILL       = ISLAND_SHAPES.collapsed;
const BAR_HEIGHT = 3;

// A thin mint bar along the bottom edge of the pill while a task runs (the silhouette clips its corners).
export const IslandPillProgress = ({ visible, fraction }: IslandPillProgressProps) => (
  <div
    aria-hidden
    className={cx('pointer-events-none absolute left-1/2 transition-opacity duration-200 [&>div]:h-[3px] [&>div]:rounded-none [&>div]:bg-transparent', visible ? 'opacity-100' : 'opacity-0')}
    style={{ top: `${PILL.height - BAR_HEIGHT}px`, width: `${PILL.width}px`, marginLeft: `${-PILL.width / 2}px` }}
  >
    <ProgressBar value={fraction} />
  </div>
);
