import { ISLAND_SHAPES } from '@/modules/island/constants/islandShape';
import { PILL_DOT } from '@/modules/island/constants/island';
import { cx } from '@/shared/utils/classNames';

interface IslandPillDotProps {
  visible: boolean;
}

const PILL = ISLAND_SHAPES.collapsed;

// A lilac dot at the right end of the pill: dropped files wait for an action.
export const IslandPillDot = ({ visible }: IslandPillDotProps) => (
  <span
    aria-hidden
    className={cx('pointer-events-none absolute left-1/2 rounded-full bg-lilac transition-opacity duration-200 motion-reduce:transition-none', visible ? 'opacity-100' : 'opacity-0')}
    style={{
      width      : PILL_DOT.size,
      height     : PILL_DOT.size,
      top        : (PILL.height - PILL_DOT.size) / 2,
      marginLeft : PILL.width / 2 - PILL_DOT.inset - PILL_DOT.size,
    }}
  />
);
