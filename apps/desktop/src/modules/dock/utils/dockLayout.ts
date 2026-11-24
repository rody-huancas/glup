import { DOCK_SHAPES, NOTICE_OVERSHOOT, NOTICE_POSE, PILL_DOT, PILL_POSES, REVEAL_ZONE } from '@/modules/dock/constants/dock';
import type { IslandPlacement } from '@/modules/dock/interfaces/islandPlacement';
import type { DockArea } from '@/modules/dock/types/dockArea';
import type { ShapeRole } from '@/modules/dock/types/shapeRole';
import { bodyBox, edgeStrip, innerBox, shapeBox } from '@/modules/dock/utils/dockGeometry';
import { alongLength, dockShape } from '@/modules/dock/utils/placement';
import type { Rect } from '@/shared/interfaces/rect';

interface MascotBoxParams {
  placement : IslandPlacement;
  // Glup's width, and its height for that width.
  width     : number;
  height    : number;
}

// The pill, its hover and its landing shake: the collapsed region has room for all three.
const PILL_ROLES: ShapeRole[] = ['collapsed', 'hover', 'settle'];

const union = (a: Rect, b: Rect): Rect => {
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  return { x, y, width: Math.max(a.x + a.width, b.x + b.width) - x, height: Math.max(a.y + a.height, b.y + b.height) - y };
};

// Kept inside the window (the region of a window cannot go past it).
const inside = (rect: Rect, { width, height }: Rect): Rect => {
  const x = Math.max(rect.x, 0);
  const y = Math.max(rect.y, 0);
  return { x, y, width: Math.min(rect.x + rect.width, width) - x, height: Math.min(rect.y + rect.height, height) - y };
};

// Lying on the top or bottom edge (only then Glup peeks out of the pill and the notice).
const isLying = (placement: IslandPlacement): boolean => placement.kind === 'horizontal';

// Hidden at rest: the strip against the edge where the pill would be (as long as the pill), or a small
// square in a corner. The cursor tracker watches it; it takes no clicks.
export const revealZone = (placement: IslandPlacement): Rect => {
  const pill = DOCK_SHAPES[placement.kind].collapsed;
  const zone = placement.kind === 'corner' ? REVEAL_ZONE.corner : alongLength(pill);
  return edgeStrip(placement, zone, REVEAL_ZONE.depth);
};

// Only hidden at rest the area is not clickable: the window's region stays empty, so nothing below it
// (clicks, a window dragged to that edge) is blocked.
export const isClickable = (placement: IslandPlacement, area: DockArea): boolean => !(placement.rest === 'hidden' && area === 'collapsed');

// The visible and clickable part of the window for each moment: the pill with room for its hover and
// landing shake (hidden: the reveal zone), the open panel, the whole frame while it opens (elastic
// overshoot), the notice popping.
export const dockRegion = (placement: IslandPlacement, area: DockArea): Rect => {
  const frame = { x: 0, y: 0, width: placement.frame.width, height: placement.frame.height };

  if (area === 'frame') return frame;
  if (area === 'collapsed' && placement.rest === 'hidden') return inside(revealZone(placement), frame);
  if (area === 'expanded') return inside(shapeBox(placement, dockShape(placement, 'expanded')), frame);

  if (area === 'notice') {
    const notice = dockShape(placement, 'notice');
    return inside(shapeBox(placement, { ...notice, width: notice.width * NOTICE_OVERSHOOT, height: notice.height * NOTICE_OVERSHOOT }), frame);
  }

  const pill = PILL_ROLES.map((role) => shapeBox(placement, dockShape(placement, role))).reduce(union);
  return inside(pill, frame);
};

// The panel's content box: the open shape's body less the border on the sides away from the screen.
export const contentBox = (placement: IslandPlacement, border: number): Rect => innerBox(placement, dockShape(placement, 'expanded'), border);

export const pillBody = (placement: IslandPlacement): Rect => bodyBox(placement, dockShape(placement, 'collapsed'));

export const noticeBody = (placement: IslandPlacement): Rect => bodyBox(placement, dockShape(placement, 'notice'));

// Glup's width in the pill, for a slot this wide.
export const pillMascotWidth = (placement: IslandPlacement, slot: number): number => slot * PILL_POSES[placement.kind].scale;

// Glup always upright: centered in the pill. On a top or bottom pill only its head peeks out (the
// silhouette crops it), as always; standing pills and corners show its face in the middle.
export const pillMascotBox = ({ placement, width, height }: MascotBoxParams): Rect => {
  const body = pillBody(placement);
  const pose = PILL_POSES[placement.kind];
  const x    = body.x + body.width / 2 - width / 2;
  const y    = pose.peek === null ? body.y + body.height / 2 - height * pose.lift : body.y + pose.peek;
  return { x, y, width, height };
};

export const noticeMascotWidth = (slot: number): number => slot * NOTICE_POSE.scale;

// At the start of the notice, a bit smaller; the text takes the rest, to its right.
export const noticeMascotBox = ({ placement, width, height }: MascotBoxParams): Rect => {
  const body = noticeBody(placement);
  const y    = isLying(placement) ? body.y + NOTICE_POSE.peek : body.y + body.height / 2 - height * NOTICE_POSE.lift;
  return { x: body.x + NOTICE_POSE.inset, y, width, height };
};

export const noticeTextBox = (placement: IslandPlacement, mascot: Rect): Rect => {
  const body  = noticeBody(placement);
  const start = mascot.x + mascot.width + NOTICE_POSE.gap;
  return { x: start, y: body.y, width: Math.max(body.x + body.width - NOTICE_POSE.end - start, 0), height: body.height };
};

// The lilac dot of a pending selection: at the far end of a lying pill, at the bottom of a standing one,
// by the inner corner of a corner one.
export const pillDotPoint = (placement: IslandPlacement): Rect => {
  const body = pillBody(placement);
  const { size, inset } = PILL_DOT;

  if (placement.kind === 'vertical') return { x: body.x + (body.width - size) / 2, y: body.y + body.height - inset - size, width: size, height: size };
  if (placement.kind === 'corner') {
    // The inner corner is the one away from both screen edges.
    const innerRight = !placement.edge.endsWith('right');
    const innerBelow = placement.edge.startsWith('top');
    return {
      x      : innerRight ? body.x + body.width - inset - size : body.x + inset,
      y      : innerBelow ? body.y + body.height - inset - size : body.y + inset,
      width  : size,
      height : size,
    };
  }
  return { x: body.x + body.width - inset - size, y: body.y + (body.height - size) / 2, width: size, height: size };
};

// The thin progress bar of a running task, along the pill's side that faces the screen (a standing pill
// has it upright).
export const pillProgressBox = (placement: IslandPlacement, thickness: number): Rect => {
  const body = pillBody(placement);

  switch (placement.edge) {
    case 'left'  : return { x: body.x + body.width - thickness, y: body.y, width: thickness, height: body.height };
    case 'right' : return { x: body.x, y: body.y, width: thickness, height: body.height };
    case 'bottom':
    case 'bottom-left':
    case 'bottom-right': return { x: body.x, y: body.y, width: body.width, height: thickness };
    default      : return { x: body.x, y: body.y + body.height - thickness, width: body.width, height: thickness };
  }
};
