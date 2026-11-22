import {
  ACTIONS_LAYOUT,
  ISLAND_SIZES,
  MASCOT_POSES,
  MASCOT_SLOT_WIDTH,
  PANEL_RADIUS,
} from '@/modules/island/constants/island';
import type { IslandLayout, WindowSize } from '@/modules/island/interfaces/islandLayout';
import type { VisibleIslandState } from '@/modules/island/types/islandState';
import { MASCOT_LAYOUT } from '@/modules/mascot/constants/layout';

interface IslandLayoutParams {
  target        : VisibleIslandState;
  actionsHeight : number;
}

const getActionsLayout = (contentHeight: number): IslandLayout => {
  const { width, padding, mascotX, mascotWidth } = ACTIONS_LAYOUT;

  const mascotHeight = (mascotWidth * MASCOT_LAYOUT.base.height) / MASCOT_LAYOUT.base.width;
  const height       = Math.ceil(Math.max(contentHeight, mascotHeight) + padding * 2);

  return {
    target : 'actions',
    size   : { width, height, radius: PANEL_RADIUS },
    pose   : { x: mascotX, y: (height - mascotHeight) / 2, scale: mascotWidth / MASCOT_SLOT_WIDTH },
  };
};

export const getIslandLayout = ({ target, actionsHeight }: IslandLayoutParams): IslandLayout => {
  if (target === 'actions') return getActionsLayout(actionsHeight);

  return { target, size: ISLAND_SIZES[target], pose: MASCOT_POSES[target] };
};

export const getBoundingSize = (a: WindowSize, b: WindowSize): WindowSize => ({
  width  : Math.max(a.width, b.width),
  height : Math.max(a.height, b.height),
});
