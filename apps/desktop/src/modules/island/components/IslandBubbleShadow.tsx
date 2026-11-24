import type { IslandPlacement } from '@/modules/dock/interfaces/islandPlacement';
import { getBubbleStyle } from '@/modules/island/utils/islandStyles';
import { cx } from '@/shared/utils/classNames';

interface IslandBubbleShadowProps {
  visible   : boolean;
  placement : IslandPlacement;
}

// The soft shadow under the resting bubble. It sits behind the island, outside its clip (which would cut
// it), within the room the bubble's region keeps around the circle.
export const IslandBubbleShadow = ({ visible, placement }: IslandBubbleShadowProps) => (
  <div
    aria-hidden
    className={cx('pointer-events-none absolute rounded-full shadow-md transition-opacity duration-150 motion-reduce:transition-none', visible ? 'opacity-100' : 'opacity-0')}
    style={getBubbleStyle(placement)}
  />
);
