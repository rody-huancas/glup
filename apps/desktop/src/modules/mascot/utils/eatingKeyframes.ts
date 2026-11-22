import type { Point } from '@/shared/interfaces/point';
import { lerpPoint } from '@/shared/utils/math';

interface FlightKeyframesParams {
  offset : Point;
  bounds : DOMRect;
}

const translate = ({ x, y }: Point): string => `translate(${x}px, ${y}px)`;

const getCenter = (rect: DOMRect): Point => ({
  x: rect.left + rect.width / 2,
  y: rect.top + rect.height / 2,
});

export const getCenterOffset = (from: Element, to: Element): Point => {
  const start = getCenter(from.getBoundingClientRect());
  const end   = getCenter(to.getBoundingClientRect());

  return { x: end.x - start.x, y: end.y - start.y };
};

export const buildFlightKeyframes = ({ offset, bounds }: FlightKeyframesParams): Keyframe[] => {
  const start  = { x: offset.x + bounds.width * 0.45, y: offset.y - bounds.height * 0.6 };
  const middle = { x: offset.x + bounds.width * 0.16, y: offset.y - bounds.height * 0.34 };
  const appear = lerpPoint({ from: start, to: middle, factor: 0.3 });

  return [
    { transform: `${translate(start)} rotate(24deg) scale(1)`, opacity: 0 },
    { transform: `${translate(appear)} rotate(20deg) scale(1)`, opacity: 1, offset: 0.15 },
    { transform: `${translate(middle)} rotate(10deg) scale(0.95)`, opacity: 1, offset: 0.5 },
    { transform: `${translate(offset)} rotate(0deg) scale(0.8)`, opacity: 1 },
  ];
};

export const buildSwallowKeyframes = (offset: Point): Keyframe[] => [
  { transform: `${translate(offset)} rotate(0deg) scale(0.8)`, opacity: 1 },
  { transform: `${translate(offset)} rotate(0deg) scale(0)`, opacity: 0 },
];
