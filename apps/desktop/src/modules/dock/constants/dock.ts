import type { BubbleSpot } from '@/modules/dock/interfaces/bubbleSpot';
import type { DockSpot } from '@/modules/dock/interfaces/dockSpot';
import type { IslandDock } from '@/modules/dock/interfaces/islandDock';
import type { PillPose } from '@/modules/dock/interfaces/pillPose';
import type { DockEdge } from '@/modules/dock/types/dockEdge';
import type { DockKind } from '@/modules/dock/types/dockKind';
import type { ShapeRole } from '@/modules/dock/types/shapeRole';
import type { IslandShape } from '@/modules/island/interfaces/islandShape';

// As it always was: on top, in the middle of the main screen.
export const DEFAULT_DOCK: IslandDock = { edge: 'top', offset: 0.5, screen: null };

export const DOCK_EDGES: DockEdge[] = ['top', 'bottom', 'left', 'right', 'top-left', 'top-right', 'bottom-left', 'bottom-right'];

export const KIND_OF: Record<DockEdge, DockKind> = {
  'top'          : 'horizontal',
  'bottom'       : 'horizontal',
  'left'         : 'vertical',
  'right'        : 'vertical',
  'top-left'     : 'corner',
  'top-right'    : 'corner',
  'bottom-left'  : 'corner',
  'bottom-right' : 'corner',
};

const shape = (width: number, height: number, earRadius: number, bottomRadius: number): IslandShape => ({ width, height, earRadius, bottomRadius, shift: 0 });

// In the edge's own terms: width runs along the edge and height goes into the screen (the vertical pill
// is the horizontal one stood up). Corners: width along the top or bottom edge, height along the side.
// The open panel is always 1040 x 640 on screen.
export const DOCK_SHAPES: Record<DockKind, Record<ShapeRole, IslandShape>> = {
  horizontal: {
    collapsed    : shape(148, 32, 12, 14),
    hover        : shape(160, 36, 12, 14),
    settle       : shape(155, 29, 12, 14),
    anticipation : shape(133, 29, 12, 14),
    expanded     : shape(1040, 640, 18, 26),
    notice       : shape(260, 40, 12, 16),
  },
  vertical: {
    collapsed    : shape(112, 46, 12, 16),
    hover        : shape(120, 50, 12, 16),
    settle       : shape(117, 43, 12, 16),
    anticipation : shape(100, 43, 12, 16),
    expanded     : shape(640, 1040, 18, 26),
    // A tab that comes out of the side, so its text reads across.
    notice       : shape(56, 260, 12, 16),
  },
  corner: {
    collapsed    : shape(60, 60, 12, 22),
    hover        : shape(66, 66, 12, 24),
    settle       : shape(63, 57, 12, 22),
    anticipation : shape(54, 54, 12, 20),
    expanded     : shape(1040, 640, 18, 26),
    notice       : shape(260, 46, 12, 18),
  },
  // No ears: a circle (its radius is half of it) that grows into the panel, and a tab as tall as it for
  // the notice, out to one side.
  bubble: {
    collapsed    : shape(56, 56, 0, 28),
    hover        : shape(60, 60, 0, 30),
    settle       : shape(60, 52, 0, 26),
    anticipation : shape(50, 50, 0, 25),
    expanded     : shape(1040, 640, 0, 26),
    notice       : shape(250, 56, 0, 28),
  },
};

// The bubble: 56 px (CSS) is a large icon, crisp at 100 % (56 px) and 150 % (84 px) as it is drawn, not a
// bitmap. pad: room around it in its region for the soft shadow and the progress ring; margin: what is
// kept from the screen's edges, by it and by the open panel.
export const BUBBLE = { size: 56, pad: 8, margin: 8, ring: { radius: 32.5, thickness: 3 } };

// The first bubble: in the middle of the main screen.
export const DEFAULT_BUBBLE: BubbleSpot = { x: 0.5, y: 0.5, screen: null };

// Room in the window for the elastic overshoot of the opening (the top one keeps the old 1200 x 720).
export const OVERSHOOT = { along: 62, depth: 80 };

// The notice grows a little past its size while it pops.
export const NOTICE_OVERSHOOT = 1.12;

// Near a corner, this close to both edges (CSS pixels), the island goes into the corner.
export const CORNER_ZONE = 140;

// The top pill shows Glup peeking out (glup-peek, its flat base on the pill's lower edge): a little
// taller than the bottom one, so its head, headphones and paws fit whole. The other edges keep theirs.
export const TOP_PILL_SHAPES: Partial<Record<ShapeRole, IslandShape>> = {
  collapsed    : shape(150, 38, 12, 14),
  hover        : shape(162, 42, 12, 14),
  settle       : shape(157, 35, 12, 14),
  anticipation : shape(135, 35, 12, 14),
  notice       : shape(260, 44, 12, 16),
};

// Glup peeking on top: px kept between the screen's edge and its headphones, and in the notice its
// height and its gap from the notice's start.
export const PEEK_POSE = { top: 3, noticeHeight: 34, noticeInset: 12 };

// Glup in each pill (see PillPose): only its head on a lying pill, its face in standing and corner ones.
export const PILL_POSES: Record<DockKind, PillPose> = {
  horizontal : { scale: 0.633, peek: -15, lift: 0 },
  vertical   : { scale: 0.34, peek: null, lift: 0.42 },
  corner     : { scale: 0.46, peek: null, lift: 0.42 },
  bubble     : { scale: 0.43, peek: null, lift: 0.42 },
};

// Glup in the notice: at its start, half size; the text goes after it.
export const NOTICE_POSE = { scale: 0.5, inset: 10, peek: -9, lift: 0.42, gap: 6, end: 14 };

// The lilac dot of a pending file selection, inside the pill (px).
export const PILL_DOT = { size: 6, inset: 14 };

// Hidden at rest: the strip against the edge, where the pill would be, that brings Glup out when the
// cursor rests there (px deep; the cursor tracker adds a small margin), and its square in a corner.
export const REVEAL_ZONE = { depth: 2, corner: 24 };

// How long the cursor rests there before Glup comes out (ms): short enough to feel at hand, long enough
// not to come out when the cursor just passes by.
export const REVEAL_DELAYS = [150, 300, 500, 800];
export const DEFAULT_REVEAL_DELAY = 300;

// How often the screens are read again, to notice one unplugged or a new resolution (ms).
export const DOCK_REFRESH = 2000;

// The work area assumed until Rust tells the real ones: on top in the middle it lays the island out as
// the startup window (1200 x 720, top center), so nothing jumps when the real placement arrives.
export const FALLBACK_WORK = { width: 1920, height: 1040 };

// The eight spots of the drawing of Ajustes (shares of its width and height).
export const DOCK_SPOTS: DockSpot[] = [
  { edge: 'top-left', x: 0, y: 0 },
  { edge: 'top', x: 0.5, y: 0 },
  { edge: 'top-right', x: 1, y: 0 },
  { edge: 'left', x: 0, y: 0.5 },
  { edge: 'right', x: 1, y: 0.5 },
  { edge: 'bottom-left', x: 0, y: 1 },
  { edge: 'bottom', x: 0.5, y: 1 },
  { edge: 'bottom-right', x: 1, y: 1 },
];

// Ajustes › Posición: after the last arrow press or slider step, how long before the island moves (ms).
export const DOCK_COMMIT_DELAY = 450;
