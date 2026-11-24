import type { CSSProperties } from 'react';
import type { IslandPlacement } from '@/modules/dock/interfaces/islandPlacement';
import { contentBox, noticeMascotBox, noticeMascotWidth, noticeTextBox, pillDotPoint, pillMascotBox, pillMascotWidth, pillProgressBox } from '@/modules/dock/utils/dockLayout';
import { MASCOT_SLOT_WIDTH, PANEL_BORDER, PROGRESS_THICKNESS } from '@/modules/island/constants/island';
import { MASCOT_LAYOUT } from '@/modules/mascot/constants/layout';
import type { Rect } from '@/shared/interfaces/rect';

// Glup's height for a width (its body's proportions).
const mascotHeight = (width: number): number => (width * MASCOT_LAYOUT.base.height) / MASCOT_LAYOUT.base.width;

export const rectStyle = ({ x, y, width, height }: Rect): CSSProperties => ({
  left   : `${x}px`,
  top    : `${y}px`,
  width  : `${width}px`,
  height : `${height}px`,
});

// Untransformed box of the flying Glup at the window's corner: Flip carries it to each anchor.
export const getFlyerStyle = (): CSSProperties => ({ left: 0, top: 0, width: `${MASCOT_SLOT_WIDTH}px` });

// Where Glup rests in the pill, upright whatever the edge.
export const getPillAnchorStyle = (placement: IslandPlacement): CSSProperties => {
  const width = pillMascotWidth(placement, MASCOT_SLOT_WIDTH);
  return rectStyle(pillMascotBox({ placement, width, height: mascotHeight(width) }));
};

const noticeMascot = (placement: IslandPlacement): Rect => {
  const width = noticeMascotWidth(MASCOT_SLOT_WIDTH);
  return noticeMascotBox({ placement, width, height: mascotHeight(width) });
};

// Where Glup sits in the live notice: at its start, a bit smaller.
export const getNoticeAnchorStyle = (placement: IslandPlacement): CSSProperties => rectStyle(noticeMascot(placement));

// The text takes the rest of the notice, after Glup.
export const getNoticeTextStyle = (placement: IslandPlacement): CSSProperties => rectStyle(noticeTextBox(placement, noticeMascot(placement)));

// The panel's content, laid out at its open size where the panel opens (toward the middle of the screen).
export const getContentStyle = (placement: IslandPlacement): CSSProperties => ({ ...rectStyle(contentBox(placement, PANEL_BORDER)), opacity: 0 });

export const getPillDotStyle = (placement: IslandPlacement): CSSProperties => rectStyle(pillDotPoint(placement));

// Along the pill's side that faces the screen; a standing pill has the bar upright (it is turned, as it
// is only a line).
export const getPillProgressStyle = (placement: IslandPlacement): CSSProperties => {
  const box = pillProgressBox(placement, PROGRESS_THICKNESS);
  if (placement.kind !== 'vertical') return rectStyle(box);

  return {
    left            : `${box.x + box.width}px`,
    top             : `${box.y}px`,
    width           : `${box.height}px`,
    height          : `${box.width}px`,
    transform       : 'rotate(90deg)',
    transformOrigin : 'top left',
  };
};
