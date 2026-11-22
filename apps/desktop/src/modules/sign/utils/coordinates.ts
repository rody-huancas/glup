import type { PageBox, PdfMatrix, RelativeRect, ScreenRect, Size } from '@/modules/sign/interfaces/geometry';
import type { Corner } from '@/modules/sign/types/corner';
import type { Point } from '@/shared/interfaces/point';

interface ShownPointParams {
  box : PageBox;
  // Points from the top-left corner of the page as shown.
  x   : number;
  y   : number;
}

interface MoveParams {
  rect : RelativeRect;
  // Relative to the page.
  dx   : number;
  dy   : number;
}

interface PixelMoveParams {
  rect : RelativeRect;
  dx   : number;
  dy   : number;
  view : Size;
}

interface ResizeParams {
  rect    : ScreenRect;
  corner  : Corner;
  dx      : number;
  dy      : number;
  bounds  : Size;
  minSize : number;
}

const clamp = (value: number, min: number, max: number): number => Math.min(Math.max(value, min), max);

// Width and height swap on a quarter turn.
export const shownSize = (box: PageBox): Size =>
  box.rotation % 180 === 0 ? { width: box.width, height: box.height } : { width: box.height, height: box.width };

export const screenToRelative = (rect: ScreenRect, view: Size): RelativeRect => ({
  x      : rect.left / view.width,
  y      : rect.top / view.height,
  width  : rect.width / view.width,
  height : rect.height / view.height,
});

export const relativeToScreen = (rect: RelativeRect, view: Size): ScreenRect => ({
  left   : rect.x * view.width,
  top    : rect.y * view.height,
  width  : rect.width * view.width,
  height : rect.height * view.height,
});

// The viewer turns the page clockwise by its rotation, so the shown top-left is the box's top-left (0°),
// bottom-left (90°), bottom-right (180°) or top-right (270°). Same as PageBox::to_pdf in Rust.
export const shownToPdf = ({ box, x, y }: ShownPointParams): Point => {
  const { left, bottom, width, height } = box;

  if (box.rotation === 90) return { x: left + y, y: bottom + x };
  if (box.rotation === 180) return { x: left + width - x, y: bottom + y };
  if (box.rotation === 270) return { x: left + width - y, y: bottom + height - x };
  return { x: left + x, y: bottom + height - y };
};

// The unit square onto the placed rectangle, upright as shown (what Rust writes before Do).
export const relativeToPdfMatrix = (rect: RelativeRect, box: PageBox): PdfMatrix => {
  const shown  = shownSize(box);
  const x      = rect.x * shown.width;
  const y      = rect.y * shown.height;
  const width  = rect.width * shown.width;
  const height = rect.height * shown.height;

  const origin = shownToPdf({ box, x, y: y + height });
  const right  = shownToPdf({ box, x: x + width, y: y + height });
  const top    = shownToPdf({ box, x, y });

  return { a: right.x - origin.x, b: right.y - origin.y, c: top.x - origin.x, d: top.y - origin.y, e: origin.x, f: origin.y };
};

// Always inside the page.
export const clampRect = (rect: RelativeRect): RelativeRect => {
  const width  = Math.min(rect.width, 1);
  const height = Math.min(rect.height, 1);

  return { x: clamp(rect.x, 0, 1 - width), y: clamp(rect.y, 0, 1 - height), width, height };
};

export const moveRect = ({ rect, dx, dy }: MoveParams): RelativeRect => clampRect({ ...rect, x: rect.x + dx, y: rect.y + dy });

// Screen pixels (drag, arrow keys) to a move on the page, whatever the zoom.
export const moveByPixels = ({ rect, dx, dy, view }: PixelMoveParams): RelativeRect =>
  moveRect({ rect, dx: dx / view.width, dy: dy / view.height });

// Keeps the proportions and the opposite corner in place; follows the axis that moved the most and
// never leaves the page or goes under minSize (on its longer side).
export const resizeFromCorner = ({ rect, corner, dx, dy, bounds, minSize }: ResizeParams): ScreenRect => {
  const ratio = rect.height / rect.width;
  const right = corner.endsWith('right');
  const down  = corner.startsWith('bottom');

  const byX    = rect.width + (right ? dx : -dx);
  const byY    = (rect.height + (down ? dy : -dy)) / ratio;
  const wanted = Math.abs(byX - rect.width) >= Math.abs(byY - rect.width) ? byX : byY;

  const anchorX  = right ? rect.left : rect.left + rect.width;
  const anchorY  = down ? rect.top : rect.top + rect.height;
  const maxWidth = Math.min(right ? bounds.width - anchorX : anchorX, (down ? bounds.height - anchorY : anchorY) / ratio);
  const minWidth = Math.min(ratio <= 1 ? minSize : minSize / ratio, maxWidth);
  const width    = clamp(wanted, minWidth, maxWidth);
  const height   = width * ratio;

  return { left: right ? anchorX : anchorX - width, top: down ? anchorY : anchorY - height, width, height };
};
