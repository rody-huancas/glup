import { HOVER_SHAPE, ISLAND_FRAME, ISLAND_SHAPES, SETTLE_SHAPE } from '@/modules/island/constants/islandShape';
import type { ShapeSize } from '@/modules/island/interfaces/islandShape';
import { getShapeSize } from '@/modules/island/utils/islandPath';

export type IslandAreaKind = 'collapsed' | 'expanded' | 'frame';

// The collapsed area also fits the hover inflate and the landing shake, ears included.
const COLLAPSED_AREA = getShapeSize({
  ...ISLAND_SHAPES.collapsed,
  width  : Math.max(ISLAND_SHAPES.collapsed.width, HOVER_SHAPE.width, SETTLE_SHAPE.width),
  height : Math.max(ISLAND_SHAPES.collapsed.height, HOVER_SHAPE.height, SETTLE_SHAPE.height),
});

const ISLAND_AREAS: Record<IslandAreaKind, ShapeSize> = {
  collapsed : COLLAPSED_AREA,
  expanded  : getShapeSize(ISLAND_SHAPES.expanded),
  frame     : ISLAND_FRAME,
};

export const getIslandArea = (kind: IslandAreaKind): ShapeSize => ISLAND_AREAS[kind];
