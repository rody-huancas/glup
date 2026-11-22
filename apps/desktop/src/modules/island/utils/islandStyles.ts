import type { CSSProperties } from 'react';
import {
  DROP_ZONE_INSETS,
  ISLAND_BACKGROUND,
  ISLAND_SIZES,
  MASCOT_POSES,
  MASCOT_SLOT_WIDTH,
} from '@/modules/island/constants/island';
import type { VisibleIslandState } from '@/modules/island/types/islandState';

export const getPanelKeyframe = (target: VisibleIslandState) => {
  const { width, height, radius } = ISLAND_SIZES[target];

  return {
    width                   : `${width}px`,
    height                  : `${height}px`,
    borderBottomLeftRadius  : `${radius}px`,
    borderBottomRightRadius : `${radius}px`,
  };
};

export const getMascotKeyframe = (target: VisibleIslandState) => {
  const { x, y, scale } = MASCOT_POSES[target];

  return { transform: `translate(${x}px, ${y}px) scale(${scale})` };
};

export const getDropZoneKeyframe = (target: VisibleIslandState) => ({
  opacity: target === 'expanded' ? 1 : 0,
});

export const getPanelStyle = (target: VisibleIslandState): CSSProperties => ({
  ...getPanelKeyframe(target),
  background: ISLAND_BACKGROUND,
});

export const getMascotSlotStyle = (target: VisibleIslandState): CSSProperties => ({
  ...getMascotKeyframe(target),
  width           : `${MASCOT_SLOT_WIDTH}px`,
  transformOrigin : '0 0',
});

export const getDropZoneStyle = (target: VisibleIslandState): CSSProperties => ({
  ...getDropZoneKeyframe(target),
  top    : `${DROP_ZONE_INSETS.top}px`,
  right  : `${DROP_ZONE_INSETS.right}px`,
  bottom : `${DROP_ZONE_INSETS.bottom}px`,
  left   : `${DROP_ZONE_INSETS.left}px`,
});
