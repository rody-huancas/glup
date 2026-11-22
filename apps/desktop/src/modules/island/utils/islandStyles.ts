import type { CSSProperties } from 'react';
import { MASCOT_SLOT_WIDTH, PEEK_POSE } from '@/modules/island/constants/island';
// import { ISLAND_COLORS, PANEL_BORDER } from '@/modules/island/constants/island';
import type { IslandLayout } from '@/modules/island/interfaces/islandLayout';
import { getContentSize } from '@/modules/island/utils/islandLayout';
// import { getThemeColor } from '@/modules/island/utils/themeColor';
import { getBodyAspectRatio } from '@/modules/mascot/utils/pieceStyle';

// Replaced by the SVG silhouette (utils/islandShape.ts).
// export const getPanelKeyframe = ({ target, size }: IslandLayout) => ({
//   width                   : `${size.width}px`,
//   height                  : `${size.height}px`,
//   borderBottomLeftRadius  : `${size.radius}px`,
//   borderBottomRightRadius : `${size.radius}px`,
//   backgroundColor         : getThemeColor(ISLAND_COLORS[target].background),
//   borderColor             : getThemeColor(ISLAND_COLORS[target].border),
// });

// export const getPeekKeyframe = ({ target }: IslandLayout) => ({
//   opacity: target === 'collapsed' ? 1 : 0,
// });

export const getContentKeyframe = ({ target }: IslandLayout) => ({
  opacity: target === 'expanded' ? 1 : 0,
});

// export const getPanelStyle = (layout: IslandLayout): CSSProperties => ({
//   ...getPanelKeyframe(layout),
//   borderStyle : 'solid',
//   borderWidth : `0 ${PANEL_BORDER}px ${PANEL_BORDER}px`,
// });

// export const getPeekStyle = (layout: IslandLayout): CSSProperties => getPeekKeyframe(layout);

// export const getMascotSlotStyle = (): CSSProperties => ({
//   width           : `${MASCOT_SLOT_WIDTH}px`,
//   transform       : `translate(${PEEK_POSE.x}px, ${PEEK_POSE.y}px) scale(${PEEK_POSE.scale})`,
//   transformOrigin : '0 0',
// });

// Untransformed box of the flying Glup, centered like the panel so it never drifts while the panel grows.
export const getFlyerStyle = (): CSSProperties => ({
  width      : `${MASCOT_SLOT_WIDTH}px`,
  marginLeft : `${-MASCOT_SLOT_WIDTH / 2}px`,
});

// Where Glup sits in the pill: only its top peeks out, cropped by the panel.
export const getPillAnchorStyle = (): CSSProperties => ({
  width       : `${MASCOT_SLOT_WIDTH * PEEK_POSE.scale}px`,
  marginLeft  : `${PEEK_POSE.x - MASCOT_SLOT_WIDTH / 2}px`,
  top         : `${PEEK_POSE.y}px`,
  aspectRatio : getBodyAspectRatio(),
});

export const getContentStyle = (layout: IslandLayout): CSSProperties => {
  const { width, height } = getContentSize();

  return {
    ...getContentKeyframe(layout),
    width  : `${width}px`,
    height : `${height}px`,
  };
};
