import { BUBBLE, DEFAULT_BUBBLE, DOCK_SHAPES } from '@/modules/dock/constants/dock';
import type { BubbleLayout } from '@/modules/dock/interfaces/bubbleLayout';
import type { BubbleSpot } from '@/modules/dock/interfaces/bubbleSpot';
import type { IslandPlacement } from '@/modules/dock/interfaces/islandPlacement';
import type { IslandScreen } from '@/modules/dock/interfaces/islandScreen';
import type { IslandShape } from '@/modules/island/interfaces/islandShape';
import type { Point } from '@/shared/interfaces/point';
import type { Rect } from '@/shared/interfaces/rect';
import type { Size } from '@/shared/interfaces/size';

interface PlaceBubbleParams {
  spot : BubbleSpot;
  // The work area of its screen, in CSS pixels: the bubble's window covers all of it.
  work : Size;
}

interface DragBubbleParams {
  // The cursor and how far the bubble's middle is from it (physical pixels of the desktop).
  cursor  : Point;
  grab    : Point;
  screens : IslandScreen[];
}

interface ResolvedBubble {
  spot   : BubbleSpot;
  screen : IslandScreen;
}

const clamp = (value: number, min: number, max: number): number => Math.min(Math.max(value, min), max);

const contains = (rect: Rect, { x, y }: Point): boolean => x >= rect.x && y >= rect.y && x < rect.x + rect.width && y < rect.y + rect.height;

const distanceTo = (rect: Rect, { x, y }: Point): number => Math.hypot(Math.max(rect.x - x, 0, x - (rect.x + rect.width)), Math.max(rect.y - y, 0, y - (rect.y + rect.height)));

const workOf = (screen: IslandScreen): Size => ({ width: screen.work.width / screen.scale, height: screen.work.height / screen.scale });

// Half of what the bubble takes with its shadow and ring, plus the margin from the screen's edges.
const reach = (): number => BUBBLE.size / 2 + BUBBLE.pad + BUBBLE.margin;

// A middle that keeps the whole bubble inside the work area (in the middle, on a screen too small).
export const fitBubble = (center: Point, work: Size): Point => {
  const room = reach();
  const fit  = (value: number, length: number) => (length <= room * 2 ? length / 2 : clamp(value, room, length - room));
  return { x: fit(center.x, work.width), y: fit(center.y, work.height) };
};

// The panel and the notice go toward the larger room: right or left, down or up.
export const bubbleLayout = (center: Point, work: Size): BubbleLayout => ({
  center,
  grow: { x: center.x <= work.width / 2 ? 1 : -1, y: center.y <= work.height / 2 ? 1 : -1 },
});

const hundredths = (value: number): number => Math.round(value * 100) / 100;

// The saved spot (shares of the work area) in CSS pixels of it, inside the screen (to a hundredth, so
// the shares do not leave their rounding in the regions).
export const bubbleCenter = (spot: BubbleSpot, work: Size): Point => {
  const center = fitBubble({ x: spot.x * work.width, y: spot.y * work.height }, work);
  return { x: hundredths(center.x), y: hundredths(center.y) };
};

// A middle (CSS pixels of the work area) back to the shares that are saved.
export const spotAt = (center: Point, work: Size, screen: string | null): BubbleSpot => {
  const fitted = fitBubble(center, work);
  return { x: fitted.x / work.width, y: fitted.y / work.height, screen };
};

// The window is the whole work area: the bubble moves inside it without moving the window, and the
// panel opens from it without ever leaving the screen.
export const placeBubble = ({ spot, work }: PlaceBubbleParams): IslandPlacement => ({
  edge   : 'top',
  kind   : 'bubble',
  frame  : { x: 0, y: 0, width: work.width, height: work.height },
  along  : 0,
  shifts : { expanded: 0, notice: 0 },
  rest   : 'bubble',
  bubble : bubbleLayout(bubbleCenter(spot, work), work),
});

// A shape of the bubble in the window. Up to the hover size it stays centered on the bubble; bigger (the
// notice, the panel) it grows from the bubble toward its room, and it is pushed back inside the screen if
// it does not fit there.
export const bubbleBox = (placement: IslandPlacement, shape: IslandShape): Rect => {
  const layout = placement.bubble;
  if (!layout) return { x: 0, y: 0, width: 0, height: 0 };

  const base   = DOCK_SHAPES.bubble.hover;
  const width  = Math.max(shape.width, 0);
  const height = Math.max(shape.height, 0);
  const start  = (center: number, length: number, rest: number, grow: number) => center - length / 2 + (grow * Math.max(length - rest, 0)) / 2;
  const keep   = (value: number, length: number, room: number) =>
    length >= room - BUBBLE.margin * 2 ? (room - length) / 2 : clamp(value, BUBBLE.margin, room - BUBBLE.margin - length);

  return {
    x : keep(start(layout.center.x, width, base.width, layout.grow.x), width, placement.frame.width),
    y : keep(start(layout.center.y, height, base.height, layout.grow.y), height, placement.frame.height),
    width,
    height,
  };
};

// A rounded rectangle (a circle when its radius is half of it): the bubble, its notice and its panel.
export const bubblePath = (box: Rect, radius: number): string => {
  const { x, y, width, height } = box;
  const r     = Math.max(Math.min(radius, width / 2, height / 2), 0);
  const round = (value: number) => Math.round(value * 100) / 100;
  const point = (px: number, py: number) => `${round(px)} ${round(py)}`;
  const arc   = (px: number, py: number) => `A ${round(r)} ${round(r)} 0 0 1 ${point(px, py)}`;

  return [
    `M ${point(x + r, y)}`,
    `L ${point(x + width - r, y)}`,
    arc(x + width, y + r),
    `L ${point(x + width, y + height - r)}`,
    arc(x + width - r, y + height),
    `L ${point(x + r, y + height)}`,
    arc(x, y + height - r),
    `L ${point(x, y + r)}`,
    arc(x + r, y),
    'Z',
  ].join(' ');
};

// The saved spot on the screens there are now. A screen that is gone (unplugged, renamed) gives way to the
// main one at the same relative spot; a broken value goes back to the middle of the main screen.
export const resolveBubble = (saved: BubbleSpot | null, screens: IslandScreen[]): ResolvedBubble | null => {
  const main = screens.find((screen) => screen.primary) ?? screens[0];
  if (!main) return null;

  const valid  = saved && Number.isFinite(saved.x) && Number.isFinite(saved.y);
  const spot   = valid ? saved : DEFAULT_BUBBLE;
  const screen = screens.find((candidate) => candidate.id === spot.screen) ?? main;
  const work   = workOf(screen);

  return { spot: spotAt({ x: clamp(spot.x, 0, 1) * work.width, y: clamp(spot.y, 0, 1) * work.height }, work, screen.id), screen };
};

// Where the dragged bubble goes: its middle follows the cursor, on the screen under it (or the nearest
// one), always inside it. Nothing snaps to an edge.
export const dragBubble = ({ cursor, grab, screens }: DragBubbleParams): BubbleSpot | null => {
  const middle = { x: cursor.x + grab.x, y: cursor.y + grab.y };
  const screen = screens.find((candidate) => contains(candidate.bounds, middle))
    ?? [...screens].sort((a, b) => distanceTo(a.bounds, middle) - distanceTo(b.bounds, middle))[0];
  if (!screen) return null;

  const local = { x: (middle.x - screen.work.x) / screen.scale, y: (middle.y - screen.work.y) / screen.scale };
  return spotAt(local, workOf(screen), screen.id);
};

// The bubble's middle on the desktop (physical pixels), to know where it was grabbed.
export const bubbleOnDesktop = (placement: IslandPlacement, screen: IslandScreen): Point | null => {
  if (!placement.bubble) return null;
  return { x: screen.work.x + placement.bubble.center.x * screen.scale, y: screen.work.y + placement.bubble.center.y * screen.scale };
};

// The same spot within a hair.
export const sameSpot = (a: BubbleSpot, b: BubbleSpot): boolean => a.screen === b.screen && Math.abs(a.x - b.x) < 0.0002 && Math.abs(a.y - b.y) < 0.0002;
