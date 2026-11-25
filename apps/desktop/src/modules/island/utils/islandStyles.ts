import type { CSSProperties } from 'react';
import { PEEK_POSE } from '@/modules/dock/constants/dock';
import type { IslandPlacement } from '@/modules/dock/interfaces/islandPlacement';
import { bubbleRingBox, contentBox, noticeBody, noticeMascotBox, noticeMascotWidth, noticeTextBox, pillBody, pillDotPoint, pillMascotBox, pillMascotWidth, pillProgressBox } from '@/modules/dock/utils/dockLayout';
import { usesPeek } from '@/modules/dock/utils/placement';
import { MASCOT_SLOT_WIDTH, PANEL_BORDER, PROGRESS_THICKNESS } from '@/modules/island/constants/island';
import { MASCOT_LAYOUT } from '@/modules/mascot/constants/layout';
import { PEEK_LAYER } from '@/modules/mascot/constants/peek';
import type { Rect } from '@/shared/interfaces/rect';

interface PeekBoxParams {
  // Where the middle of the peeking Glup goes (or its start, in the notice), and its flat base.
  x      : number;
  bottom : number;
  // Its height on screen; from: 'center' puts x in its middle, 'start' at its left.
  height : number;
  from   : 'center' | 'start';
}

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

// The peeking Glup on screen (the drawing itself) and the box of the whole Glup around it: the box is
// what the flight lands on, and the peek layer sits in it (PEEK_LAYER).
const peekRects = ({ x, bottom, height, from }: PeekBoxParams): { visible: Rect; box: Rect } => {
  const boxHeight = height / (PEEK_LAYER.h / 100);
  const boxWidth  = (boxHeight * MASCOT_LAYOUT.base.width) / MASCOT_LAYOUT.base.height;
  const width     = (boxWidth * PEEK_LAYER.w) / 100;
  const left      = from === 'center' ? x - width / 2 : x;
  const visible   = { x: left, y: bottom - height, width, height };
  const box       = { x: left - (boxWidth * PEEK_LAYER.x) / 100, y: visible.y - (boxHeight * PEEK_LAYER.y) / 100, width: boxWidth, height: boxHeight };
  return { visible, box };
};

// On top: centered in the pill, its flat base on the pill's lower edge, its headphones just under the
// screen's edge.
const pillPeek = (placement: IslandPlacement) => {
  const body = pillBody(placement);
  return peekRects({ x: body.x + body.width / 2, bottom: body.y + body.height, height: body.height - PEEK_POSE.top, from: 'center' });
};

const noticePeek = (placement: IslandPlacement) => {
  const body = noticeBody(placement);
  return peekRects({ x: body.x + PEEK_POSE.noticeInset, bottom: body.y + body.height, height: PEEK_POSE.noticeHeight, from: 'start' });
};

// Where Glup rests in the pill, upright whatever the edge; peeking out of the top one.
export const getPillAnchorStyle = (placement: IslandPlacement): CSSProperties => {
  if (usesPeek(placement)) return rectStyle(pillPeek(placement).box);

  const width = pillMascotWidth(placement, MASCOT_SLOT_WIDTH);
  return rectStyle(pillMascotBox({ placement, width, height: mascotHeight(width) }));
};

const noticeMascot = (placement: IslandPlacement): Rect => {
  if (usesPeek(placement)) return noticePeek(placement).box;

  const width = noticeMascotWidth(MASCOT_SLOT_WIDTH);
  return noticeMascotBox({ placement, width, height: mascotHeight(width) });
};

// Where Glup sits in the live notice: at its start, a bit smaller (peeking, on top).
export const getNoticeAnchorStyle = (placement: IslandPlacement): CSSProperties => rectStyle(noticeMascot(placement));

// The text takes the rest of the notice, after what shows of Glup.
export const getNoticeTextStyle = (placement: IslandPlacement): CSSProperties =>
  rectStyle(noticeTextBox(placement, usesPeek(placement) ? noticePeek(placement).visible : noticeMascot(placement)));

// The panel's content, laid out at its open size where the panel opens (toward the middle of the screen).
export const getContentStyle = (placement: IslandPlacement): CSSProperties => ({ ...rectStyle(contentBox(placement, PANEL_BORDER)), opacity: 0 });

export const getPillDotStyle = (placement: IslandPlacement): CSSProperties => rectStyle(pillDotPoint(placement));

// The resting bubble's circle (for its shadow) and the box of its progress ring.
export const getBubbleStyle = (placement: IslandPlacement): CSSProperties => rectStyle(pillBody(placement));

export const getBubbleRingStyle = (placement: IslandPlacement): CSSProperties => rectStyle(bubbleRingBox(placement));

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
