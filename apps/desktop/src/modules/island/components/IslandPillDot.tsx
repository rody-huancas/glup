import type { IslandPlacement } from '@/modules/dock/interfaces/islandPlacement';
import { getPillDotStyle } from '@/modules/island/utils/islandStyles';
import { cx } from '@/shared/utils/classNames';

interface IslandPillDotProps {
  visible   : boolean;
  placement : IslandPlacement;
}

// A lilac dot at the end of the pill: dropped files wait for an action.
export const IslandPillDot = ({ visible, placement }: IslandPillDotProps) => (
  <span
    aria-hidden
    className={cx('pointer-events-none absolute rounded-full bg-lilac transition-opacity duration-200 motion-reduce:transition-none', visible ? 'opacity-100' : 'opacity-0')}
    style={getPillDotStyle(placement)}
  />
);
