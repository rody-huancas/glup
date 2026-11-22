import type { Point } from '@/shared/interfaces/point';

interface LerpParams<T> {
  from   : T;
  to     : T;
  factor : number;
}

export const lerp = ({ from, to, factor }: LerpParams<number>): number => from + (to - from) * factor;

export const lerpPoint = ({ from, to, factor }: LerpParams<Point>): Point => ({
  x: lerp({ from: from.x, to: to.x, factor }),
  y: lerp({ from: from.y, to: to.y, factor }),
});

export const distance = (a: Point, b: Point): number => Math.hypot(a.x - b.x, a.y - b.y);

export const randomBetween = (min: number, max: number): number => min + Math.random() * (max - min);
