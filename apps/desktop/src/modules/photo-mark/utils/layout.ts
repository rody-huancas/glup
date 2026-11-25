import type { MarkPlace } from '@/modules/photo-mark/types/markTypes';

// The same rules as Rust (services/photo_mark/layout.rs), so the preview is what will be saved.
export const MARGIN = 0.04;
export const MOSAIC_ANGLE = 30;
const GAP_X = 0.6;
const GAP_Y = 2.2;

export const markHeight = (width: number, height: number, size: number): number => Math.max(4, Math.round(Math.min(width, height) * Math.min(0.5, Math.max(0.01, size))));

export const margin = (width: number, height: number): number => Math.round(Math.min(width, height) * MARGIN);

interface PlaceParams {
  place  : MarkPlace;
  width  : number;
  height : number;
  markW  : number;
  markH  : number;
}

// The top-left corner of the mark at one of the nine places.
export const placeAt = ({ place, width, height, markW, markH }: PlaceParams): [number, number] => {
  const edge   = margin(width, height);
  const middle = (whole: number, part: number) => Math.trunc((whole - part) / 2);
  const column = place.endsWith('left') ? edge : place.endsWith('right') ? width - markW - edge : middle(width, markW);
  const row    = place.startsWith('top') ? edge : place.startsWith('bottom') ? height - markH - edge : middle(height, markH);
  return [column, row];
};

// «En mosaico»: the centres of the turned marks (every other row shifted half a step), over the photo.
export const mosaicCenters = ({ width, height, markW, markH }: Omit<PlaceParams, 'place'>): [number, number][] => {
  const stepX   = markW * (1 + GAP_X);
  const stepY   = markH * (1 + GAP_Y);
  const reach   = Math.hypot(width, height) / 2 + Math.max(markW, markH);
  const angle   = (-MOSAIC_ANGLE * Math.PI) / 180;
  const [sin, cos] = [Math.sin(angle), Math.cos(angle)];
  const rows    = Math.ceil(reach / stepY);
  const columns = Math.ceil(reach / stepX) + 1;
  const pad     = Math.max(markW, markH);
  const centers: [number, number][] = [];
  for (let row = -rows; row <= rows; row += 1) {
    const shift = Math.abs(row % 2) === 1 ? stepX / 2 : 0;
    for (let column = -columns; column <= columns; column += 1) {
      const [gx, gy] = [column * stepX + shift, row * stepY];
      const [x, y]   = [width / 2 + gx * cos - gy * sin, height / 2 + gx * sin + gy * cos];
      if (x > -pad && x < width + pad && y > -pad && y < height + pad) centers.push([x, y]);
    }
  }
  return centers;
};

// The room the text's shadow takes around it (draw.rs, text_stamp).
export const shadowPad = (markH: number, shadow: boolean): number => (shadow ? Math.max(2, Math.floor(markH / 8)) : 0);
