import type { IslandPlacement } from '@/modules/dock/interfaces/islandPlacement';
import type { DockEdge } from '@/modules/dock/types/dockEdge';
import { bubbleBox, bubblePath } from '@/modules/dock/utils/bubble';
import { alongLength } from '@/modules/dock/utils/placement';
import type { IslandShape } from '@/modules/island/interfaces/islandShape';
import type { Point } from '@/shared/interfaces/point';
import type { Rect } from '@/shared/interfaces/rect';

// A path drawn in the edge's own terms: u runs along the edge, v goes into the screen (for corners, u
// along the top or bottom edge and v along the side). It becomes window coordinates without any CSS
// rotation, so what is inside (Glup, the panel) always stays upright.
type Command = { kind: 'M' | 'L'; u: number; v: number } | { kind: 'A'; radius: number; sweep: 0 | 1; u: number; v: number } | { kind: 'Z' };

interface Metrics {
  width  : number;
  height : number;
  ear    : number;
  bottom : number;
}

const round = (value: number): number => Math.round(value * 100) / 100;

// Mirrors (bottom, left, and the corners on one side) reverse the turn of every arc.
const MIRRORED: DockEdge[] = ['bottom', 'left', 'top-right', 'bottom-left'];

const isCorner = (edge: DockEdge): boolean => edge.includes('-');

export const mapPoint = (placement: IslandPlacement, u: number, v: number): Point => {
  const { width, height } = placement.frame;

  switch (placement.edge) {
    case 'top'          : return { x: u, y: v };
    case 'bottom'       : return { x: u, y: height - v };
    case 'left'         : return { x: v, y: u };
    case 'right'        : return { x: width - v, y: u };
    case 'top-left'     : return { x: u, y: v };
    case 'top-right'    : return { x: width - u, y: v };
    case 'bottom-left'  : return { x: u, y: height - v };
    case 'bottom-right' : return { x: width - u, y: height - v };
  }
};

const mapRect = (placement: IslandPlacement, [u0, u1]: [number, number], [v0, v1]: [number, number]): Rect => {
  const a = mapPoint(placement, u0, v0);
  const b = mapPoint(placement, u1, v1);
  return { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), width: Math.abs(b.x - a.x), height: Math.abs(b.y - a.y) };
};

// Radii that never overlap, even while the shape squashes below its resting size.
const metricsOf = (shape: IslandShape, corner: boolean): Metrics => {
  const width  = Math.max(shape.width, 0);
  const height = Math.max(shape.height, 0);
  const ear    = Math.max(Math.min(shape.earRadius, height, corner ? width : height), 0);
  const limit  = corner ? Math.min(width - ear, height - ear) : Math.min(height - ear, width / 2);
  const bottom = Math.max(Math.min(shape.bottomRadius, limit), 0);
  return { width, height, ear, bottom };
};

// Where the shape starts along its edge (the corner ones start at the corner).
const startOf = (placement: IslandPlacement, shape: IslandShape): number => placement.along + shape.shift - alongLength(shape) / 2;

// Glued to the edge, with a concave ear at each end and rounded inner corners: the island of always.
// Open, it leaves out the stretch along the screen's edge.
const edgeCommands = (start: number, { width, height, ear, bottom }: Metrics, closed: boolean): Command[] => {
  const end   = start + width + ear * 2;
  const left  = start + ear;
  const right = start + width + ear;

  if (!closed) {
    return [
      { kind: 'M', u: start, v: 0 },
      { kind: 'A', radius: ear, sweep: 1, u: left, v: ear },
      { kind: 'L', u: left, v: height - bottom },
      { kind: 'A', radius: bottom, sweep: 0, u: left + bottom, v: height },
      { kind: 'L', u: right - bottom, v: height },
      { kind: 'A', radius: bottom, sweep: 0, u: right, v: height - bottom },
      { kind: 'L', u: right, v: ear },
      { kind: 'A', radius: ear, sweep: 1, u: end, v: 0 },
    ];
  }

  return [
    { kind: 'M', u: start, v: 0 },
    { kind: 'L', u: end, v: 0 },
    { kind: 'A', radius: ear, sweep: 0, u: right, v: ear },
    { kind: 'L', u: right, v: height - bottom },
    { kind: 'A', radius: bottom, sweep: 1, u: right - bottom, v: height },
    { kind: 'L', u: left + bottom, v: height },
    { kind: 'A', radius: bottom, sweep: 1, u: left, v: height - bottom },
    { kind: 'L', u: left, v: ear },
    { kind: 'A', radius: ear, sweep: 0, u: start, v: 0 },
    { kind: 'Z' },
  ];
};

// Leaning on both edges from the corner: an ear where it leaves each edge and the inner corner rounded.
const cornerCommands = ({ width, height, ear, bottom }: Metrics, closed: boolean): Command[] => {
  const rim: Command[] = [
    { kind: 'A', radius: ear, sweep: 0, u: width, v: ear },
    { kind: 'L', u: width, v: height - bottom },
    { kind: 'A', radius: bottom, sweep: 1, u: width - bottom, v: height },
    { kind: 'L', u: ear, v: height },
    { kind: 'A', radius: ear, sweep: 0, u: 0, v: height + ear },
  ];

  if (!closed) return [{ kind: 'M', u: width + ear, v: 0 }, ...rim];

  return [{ kind: 'M', u: 0, v: 0 }, { kind: 'L', u: width + ear, v: 0 }, ...rim, { kind: 'Z' }];
};

const toPath = (placement: IslandPlacement, commands: Command[]): string => {
  const mirrored = MIRRORED.includes(placement.edge);

  return commands
    .map((command) => {
      if (command.kind === 'Z') return 'Z';

      const { x, y } = mapPoint(placement, command.u, command.v);
      if (command.kind !== 'A') return `${command.kind} ${round(x)} ${round(y)}`;

      const sweep = mirrored ? 1 - command.sweep : command.sweep;
      return `A ${round(command.radius)} ${round(command.radius)} 0 0 ${sweep} ${round(x)} ${round(y)}`;
    })
    .join(' ');
};

const commandsFor = (placement: IslandPlacement, shape: IslandShape, closed: boolean): Command[] => {
  const corner  = isCorner(placement.edge);
  const metrics = metricsOf(shape, corner);
  return corner ? cornerCommands(metrics, closed) : edgeCommands(startOf(placement, shape), metrics, closed);
};

const isBubble = (placement: IslandPlacement): boolean => placement.kind === 'bubble';

// The silhouette that fills and clips the island, in window coordinates.
export const buildDockPath = (placement: IslandPlacement, shape: IslandShape): string =>
  isBubble(placement) ? bubblePath(bubbleBox(placement, shape), shape.bottomRadius) : toPath(placement, commandsFor(placement, shape, true));

// The same silhouette left open where it touches the screen's edges, so the border never draws there.
// The bubble touches none: its border goes all around.
export const buildDockOutline = (placement: IslandPlacement, shape: IslandShape): string =>
  isBubble(placement) ? buildDockPath(placement, shape) : toPath(placement, commandsFor(placement, shape, false));

// The whole shape, ears included, in window coordinates.
export const shapeBox = (placement: IslandPlacement, shape: IslandShape): Rect => {
  if (isBubble(placement)) return bubbleBox(placement, shape);

  const { width, height, ear } = metricsOf(shape, isCorner(placement.edge));
  if (isCorner(placement.edge)) return mapRect(placement, [0, width + ear], [0, height + ear]);

  const start = startOf(placement, shape);
  return mapRect(placement, [start, start + width + ear * 2], [0, height]);
};

// A strip against the screen's edge, `along` long around the pill's spot and `depth` deep (for corners,
// a square of side `along` at the corner): what reveals a hidden Glup.
export const edgeStrip = (placement: IslandPlacement, along: number, depth: number): Rect => {
  if (isCorner(placement.edge)) return mapRect(placement, [0, along], [0, along]);
  return mapRect(placement, [placement.along - along / 2, placement.along + along / 2], [0, depth]);
};

// Its body, without the ears: where the content of the shape (Glup, a notice, the panel) goes.
export const bodyBox = (placement: IslandPlacement, shape: IslandShape): Rect => {
  if (isBubble(placement)) return bubbleBox(placement, shape);

  const { width, height, ear } = metricsOf(shape, isCorner(placement.edge));
  if (isCorner(placement.edge)) return mapRect(placement, [0, width], [0, height]);

  const start = startOf(placement, shape) + ear;
  return mapRect(placement, [start, start + width], [0, height]);
};

// The body pulled in by `inset` on the sides that do not touch the screen (the border goes there).
export const innerBox = (placement: IslandPlacement, shape: IslandShape, inset: number): Rect => {
  if (isBubble(placement)) {
    const box = bubbleBox(placement, shape);
    return { x: box.x + inset, y: box.y + inset, width: Math.max(box.width - inset * 2, 0), height: Math.max(box.height - inset * 2, 0) };
  }

  const { width, height, ear } = metricsOf(shape, isCorner(placement.edge));
  if (isCorner(placement.edge)) return mapRect(placement, [0, width - inset], [0, height - inset]);

  const start = startOf(placement, shape) + ear;
  return mapRect(placement, [start + inset, start + width - inset], [0, height - inset]);
};
