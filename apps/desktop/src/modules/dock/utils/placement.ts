import { DOCK_SHAPES, KIND_OF, NOTICE_OVERSHOOT, OVERSHOOT } from '@/modules/dock/constants/dock';
import type { IslandDock } from '@/modules/dock/interfaces/islandDock';
import type { IslandPlacement } from '@/modules/dock/interfaces/islandPlacement';
import type { DockEdge } from '@/modules/dock/types/dockEdge';
import type { ShapeRole } from '@/modules/dock/types/shapeRole';
import type { IslandShape } from '@/modules/island/interfaces/islandShape';
import type { Rect } from '@/shared/interfaces/rect';
import type { Size } from '@/shared/interfaces/size';

interface PlaceIslandParams {
  dock : IslandDock;
  // The work area of its screen (without the taskbar), in CSS pixels.
  work : Size;
}

const clamp = (value: number, min: number, max: number): number => Math.min(Math.max(value, min), max);

// A shape's length along its edge, ears included.
export const alongLength = (shape: IslandShape): number => shape.width + shape.earRadius * 2;

// Where the middle of something this long can sit on an edge this long without leaving it.
const fitCenter = (center: number, length: number, edge: number): number => (length >= edge ? edge / 2 : clamp(center, length / 2, edge - length / 2));

const isHorizontal = (edge: DockEdge): boolean => edge === 'top' || edge === 'bottom';

// The resting pill and what grows from it (hover, the landing shake) have to fit at its spot.
const pillLength = (edge: DockEdge): number => {
  const shapes = DOCK_SHAPES[KIND_OF[edge]];
  return Math.max(alongLength(shapes.collapsed), alongLength(shapes.hover), alongLength(shapes.settle));
};

// The pill's middle along its edge for an offset from 0 (start) to 1 (end).
export const pillCenter = (edge: DockEdge, offset: number, edgeLength: number): number => {
  const length = pillLength(edge);
  return fitCenter(length / 2 + clamp(offset, 0, 1) * (edgeLength - length), length, edgeLength);
};

// The offset that puts the pill's middle at this spot of its edge (the inverse of pillCenter).
export const offsetAt = (edge: DockEdge, position: number, edgeLength: number): number => {
  const length = pillLength(edge);
  return edgeLength <= length ? 0.5 : clamp((position - length / 2) / (edgeLength - length), 0, 1);
};

const placeOnEdge = ({ dock, work }: PlaceIslandParams): IslandPlacement => {
  const edge     = dock.edge;
  const shapes   = DOCK_SHAPES[KIND_OF[edge]];
  const length   = isHorizontal(edge) ? work.width : work.height;
  const room     = isHorizontal(edge) ? work.height : work.width;
  const pill     = pillLength(edge);
  const panel    = alongLength(shapes.expanded);
  const notice   = alongLength(shapes.notice) * NOTICE_OVERSHOOT;
  const center   = pillCenter(edge, dock.offset, length);
  const opened   = fitCenter(center, panel + OVERSHOOT.along * 2, length);
  const told     = fitCenter(center, notice, length);
  const start    = clamp(Math.min(center - pill / 2, opened - panel / 2 - OVERSHOOT.along, told - notice / 2), 0, length);
  const end      = clamp(Math.max(center + pill / 2, opened + panel / 2 + OVERSHOOT.along, told + notice / 2), 0, length);
  const depth    = Math.min(shapes.expanded.height + OVERSHOOT.depth, room);
  const span     = end - start;

  const frames: Record<'top' | 'bottom' | 'left' | 'right', Rect> = {
    top    : { x: start, y: 0, width: span, height: depth },
    bottom : { x: start, y: work.height - depth, width: span, height: depth },
    left   : { x: 0, y: start, width: depth, height: span },
    right  : { x: work.width - depth, y: start, width: depth, height: span },
  };

  return {
    edge,
    kind   : KIND_OF[edge],
    frame  : frames[edge as keyof typeof frames],
    along  : center - start,
    shifts : { expanded: opened - center, notice: told - center },
  };
};

const placeInCorner = ({ dock, work }: PlaceIslandParams): IslandPlacement => {
  const expanded = DOCK_SHAPES.corner.expanded;
  const width    = Math.min(expanded.width + expanded.earRadius + OVERSHOOT.depth, work.width);
  const height   = Math.min(expanded.height + expanded.earRadius + OVERSHOOT.depth, work.height);
  const right    = dock.edge.endsWith('right');
  const bottom   = dock.edge.startsWith('bottom');

  return {
    edge   : dock.edge,
    kind   : 'corner',
    frame  : { x: right ? work.width - width : 0, y: bottom ? work.height - height : 0, width, height },
    along  : 0,
    shifts : { expanded: 0, notice: 0 },
  };
};

// The window covers the pill and everything that grows from it (the panel with its overshoot, the
// notice), toward the middle of the screen and never outside its work area.
export const placeIsland = (params: PlaceIslandParams): IslandPlacement =>
  KIND_OF[params.dock.edge] === 'corner' ? placeInCorner(params) : placeOnEdge(params);

// One of the island's shapes for this placement (the open panel and the notice slide with their shift).
export const dockShape = (placement: IslandPlacement, role: ShapeRole): IslandShape => {
  const base  = DOCK_SHAPES[placement.kind][role];
  const shift = role === 'expanded' ? placement.shifts.expanded : role === 'notice' ? placement.shifts.notice : 0;
  return { ...base, shift };
};
