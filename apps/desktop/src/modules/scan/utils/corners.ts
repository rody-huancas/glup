import { CORNER_BIG_STEP, CORNER_STEP } from '@/modules/scan/constants/scan';
import type { Quad } from '@/modules/scan/types/quad';
import type { Point } from '@/shared/interfaces/point';

const clamp = (value: number): number => Math.min(1, Math.max(0, value));

export const clampPoint = (point: Point): Point => ({ x: clamp(point.x), y: clamp(point.y) });

interface MoveCornerParams {
  corners : Quad;
  index   : number;
  point   : Point;
}

// One corner to a new place, inside the photo.
export const moveCorner = ({ corners, index, point }: MoveCornerParams): Quad =>
  corners.map((corner, at) => (at === index ? clampPoint(point) : corner)) as Quad;

const ARROWS: Record<string, Point> = {
  ArrowLeft  : { x: -1, y: 0 },
  ArrowRight : { x: 1, y: 0 },
  ArrowUp    : { x: 0, y: -1 },
  ArrowDown  : { x: 0, y: 1 },
};

interface NudgeCornerParams {
  corners : Quad;
  index   : number;
  key     : string;
  big     : boolean;
}

// The arrows move the corner a little (Shift: more); any other key, nothing (null).
export const nudgeCorner = ({ corners, index, key, big }: NudgeCornerParams): Quad | null => {
  const arrow = ARROWS[key];
  if (!arrow) return null;
  const step  = big ? CORNER_BIG_STEP : CORNER_STEP;
  const from  = corners[index];
  return moveCorner({ corners, index, point: { x: from.x + arrow.x * step, y: from.y + arrow.y * step } });
};

// Every corner turns the same way (measured in the photo's pixels, which are not square in shares).
export const isConvexQuad = (corners: Quad, width = 1, height = 1): boolean => {
  const points = corners.map((corner) => ({ x: corner.x * width, y: corner.y * height }));
  const turns  = points.map((point, index) => {
    const next  = points[(index + 1) % 4];
    const after = points[(index + 2) % 4];
    return (next.x - point.x) * (after.y - next.y) - (next.y - point.y) * (after.x - next.x);
  });
  return turns.every((turn) => turn > 0) || turns.every((turn) => turn < 0);
};

// The shape that darkens what is outside the sheet: the whole box, with the sheet cut out of it.
export const outsidePath = (corners: Quad, width: number, height: number): string => {
  const [first, ...rest] = corners.map((corner) => `${corner.x * width} ${corner.y * height}`);
  return `M0 0 H${width} V${height} H0 Z M${first} ${rest.map((point) => `L${point}`).join(' ')} Z`;
};
