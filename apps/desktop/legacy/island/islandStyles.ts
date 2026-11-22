import type { CSSProperties } from 'react';
import {
  ACTIONS_LAYOUT,
  DROP_ZONE_INSETS,
  ISLAND_BACKGROUND,
  MASCOT_SLOT_WIDTH,
} from '@/modules/island/constants/island';
import type { IslandLayout } from '@/modules/island/interfaces/islandLayout';

export const getPanelKeyframe = ({ size }: IslandLayout) => ({
  width                   : `${size.width}px`,
  height                  : `${size.height}px`,
  borderBottomLeftRadius  : `${size.radius}px`,
  borderBottomRightRadius : `${size.radius}px`,
});

export const getMascotKeyframe = ({ pose }: IslandLayout) => ({
  transform: `translate(${pose.x}px, ${pose.y}px) scale(${pose.scale})`,
});

export const getDropZoneKeyframe = ({ target }: IslandLayout) => ({
  opacity: target === 'expanded' ? 1 : 0,
});

export const getActionsKeyframe = ({ target }: IslandLayout) => ({
  opacity: target === 'actions' ? 1 : 0,
});

export const getPanelStyle = (layout: IslandLayout): CSSProperties => ({
  ...getPanelKeyframe(layout),
  background: ISLAND_BACKGROUND,
});

export const getMascotSlotStyle = (layout: IslandLayout): CSSProperties => ({
  ...getMascotKeyframe(layout),
  width           : `${MASCOT_SLOT_WIDTH}px`,
  transformOrigin : '0 0',
});

export const getDropZoneStyle = (layout: IslandLayout): CSSProperties => ({
  ...getDropZoneKeyframe(layout),
  top    : `${DROP_ZONE_INSETS.top}px`,
  right  : `${DROP_ZONE_INSETS.right}px`,
  bottom : `${DROP_ZONE_INSETS.bottom}px`,
  left   : `${DROP_ZONE_INSETS.left}px`,
});

export const getActionsSlotStyle = (layout: IslandLayout): CSSProperties => ({
  ...getActionsKeyframe(layout),
  top   : `${ACTIONS_LAYOUT.padding}px`,
  left  : `${ACTIONS_LAYOUT.contentLeft}px`,
  width : `${ACTIONS_LAYOUT.width - ACTIONS_LAYOUT.contentLeft - ACTIONS_LAYOUT.padding}px`,
});
