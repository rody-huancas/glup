import { ISLAND_SIZES, PANEL_BORDER } from '@/modules/island/constants/island';
import { ISLAND_SHAPES } from '@/modules/island/constants/islandShape';
import type { IslandLayout, WindowSize } from '@/modules/island/interfaces/islandLayout';
import type { VisibleIslandState } from '@/modules/island/types/islandState';

export const getIslandLayout = (target: VisibleIslandState): IslandLayout => ({
  target,
  size: ISLAND_SIZES[target],
});

// The content keeps the expanded size while the panel animates around it.
export const getContentSize = (): WindowSize => ({
  width  : ISLAND_SHAPES.expanded.width - PANEL_BORDER * 2,
  height : ISLAND_SHAPES.expanded.height - PANEL_BORDER,
  // width  : ISLAND_SIZES.expanded.width - PANEL_BORDER * 2,
  // height : ISLAND_SIZES.expanded.height - PANEL_BORDER,
});

export const getBoundingSize = (a: WindowSize, b: WindowSize): WindowSize => ({
  width  : Math.max(a.width, b.width),
  height : Math.max(a.height, b.height),
});
