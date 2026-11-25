import type { Rect } from '@/shared/interfaces/rect';
import type { Size } from '@/shared/interfaces/size';

// The photo as large as it fits in its box, centred.
export const fitRect = (box: Size, photo: Size): Rect => {
  if (box.width <= 0 || box.height <= 0 || photo.width <= 0 || photo.height <= 0) return { x: 0, y: 0, width: 0, height: 0 };
  const scale = Math.min(box.width / photo.width, box.height / photo.height);
  const width = photo.width * scale;
  const height = photo.height * scale;
  return { x: (box.width - width) / 2, y: (box.height - height) / 2, width, height };
};

interface LoupeParams {
  // The corner, in pixels of the box.
  x    : number;
  y    : number;
  box  : Size;
  size : number;
  gap  : number;
}

// The magnifier goes up and to the left of the corner, so the finger or cursor never covers it; near
// an edge it goes to the other side.
export const loupeAt = ({ x, y, box, size, gap }: LoupeParams): { left: number; top: number } => {
  const left = x - gap - size >= 0 ? x - gap - size : Math.min(x + gap, box.width - size);
  const top  = y - gap - size >= 0 ? y - gap - size : Math.min(y + gap, box.height - size);
  return { left: Math.max(0, left), top: Math.max(0, top) };
};
