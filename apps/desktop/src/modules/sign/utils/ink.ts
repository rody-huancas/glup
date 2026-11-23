import type { PixelImage } from '@/modules/sign/interfaces/pixelImage';

export type Rgb = [number, number, number];

interface CropParams {
  image   : PixelImage;
  padding : number;
}

interface RecolorParams {
  image : PixelImage;
  color : Rgb;
}

interface PrepareParams {
  image   : PixelImage;
  // null keeps the stroke's own color ("Original").
  color   : Rgb | null;
  padding : number;
}

interface Bounds {
  left   : number;
  top    : number;
  width  : number;
  height : number;
}

// Darker than this alpha counts as content when cropping.
const MIN_ALPHA = 8;

// An image is already cut out when at least this share of its pixels is (nearly) transparent.
export const TRANSPARENCY = { alpha: 128, share: 0.1 };

// Soft matte: how much darker than the local paper a pixel must be to start (and to finish) being ink.
export const MATTE = { start: 0.08, full: 0.4, tiles: 12, minTile: 16, percentile: 0.9 };

// Specks: tiny islands of ink, or small and faint ones, are dust (not strokes, which are long).
export const SPECKS = { alpha: 8, tiny: 4, small: 24, faint: 150 };

const luminance = (r: number, g: number, b: number): number => 0.299 * r + 0.587 * g + 0.114 * b;

const clamp = (value: number, min: number, max: number): number => Math.min(Math.max(value, min), max);

const smoothstep = (edge0: number, edge1: number, value: number): number => {
  const t = clamp((value - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
};

export const hexToRgb = (hex: string): Rgb => {
  const value = Number.parseInt(hex.replace('#', ''), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
};

export const transparentShare = (image: PixelImage): number => {
  let count = 0;

  for (let index = 3; index < image.data.length; index += 4) {
    if (image.data[index] < TRANSPARENCY.alpha) count += 1;
  }

  return count / Math.max(1, image.width * image.height);
};

// A PNG that is already cut out is used as is (only cropped): removing a background it does not have
// is what cut the strokes into pieces.
export const hasRealTransparency = (image: PixelImage): boolean => transparentShare(image) >= TRANSPARENCY.share;

interface PaperGrid {
  columns : number;
  rows    : number;
  tile    : number;
  // Per tile: luminance and color of the paper (bright percentile), so shadows and uneven light are followed.
  shade   : Float32Array;
  color   : Float32Array;
}

const paperGrid = (image: PixelImage): PaperGrid => {
  const tile    = Math.max(MATTE.minTile, Math.round(Math.min(image.width, image.height) / MATTE.tiles));
  const columns = Math.ceil(image.width / tile);
  const rows    = Math.ceil(image.height / tile);
  const shade   = new Float32Array(columns * rows);
  const color   = new Float32Array(columns * rows * 3);

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const values: number[] = [];
      const pixels: number[] = [];

      for (let y = row * tile; y < Math.min(image.height, (row + 1) * tile); y += 1) {
        for (let x = column * tile; x < Math.min(image.width, (column + 1) * tile); x += 1) {
          const index = (y * image.width + x) * 4;
          values.push(luminance(image.data[index], image.data[index + 1], image.data[index + 2]));
          pixels.push(index);
        }
      }

      const sorted = [...values].sort((a, b) => a - b);
      const level  = sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * MATTE.percentile))] ?? 255;
      const cell   = row * columns + column;
      let sum      = [0, 0, 0];
      let count    = 0;

      values.forEach((value, position) => {
        if (value < level) return;
        const index = pixels[position];
        sum   = [sum[0] + image.data[index], sum[1] + image.data[index + 1], sum[2] + image.data[index + 2]];
        count += 1;
      });

      shade[cell] = level;
      color.set(sum.map((channel) => channel / Math.max(1, count)), cell * 3);
    }
  }

  return { columns, rows, tile, shade, color };
};

// Bilinear between tile centers: a smooth paper estimate for every pixel, written into `out`
// (luminance, then R, G, B) so the per-pixel loop allocates nothing.
const paperAt = (grid: PaperGrid, point: [number, number], out: Float32Array) => {
  const gx = clamp((point[0] + 0.5) / grid.tile - 0.5, 0, grid.columns - 1);
  const gy = clamp((point[1] + 0.5) / grid.tile - 0.5, 0, grid.rows - 1);
  const x0 = Math.floor(gx);
  const y0 = Math.floor(gy);
  const x1 = Math.min(x0 + 1, grid.columns - 1);
  const y1 = Math.min(y0 + 1, grid.rows - 1);
  const fx = gx - x0;
  const fy = gy - y0;

  const weights = [(1 - fx) * (1 - fy), fx * (1 - fy), (1 - fx) * fy, fx * fy];
  const cells   = [y0 * grid.columns + x0, y0 * grid.columns + x1, y1 * grid.columns + x0, y1 * grid.columns + x1];

  out.fill(0);
  for (let corner = 0; corner < 4; corner += 1) {
    out[0] += grid.shade[cells[corner]] * weights[corner];
    for (let channel = 0; channel < 3; channel += 1) out[channel + 1] += grid.color[cells[corner] * 3 + channel] * weights[corner];
  }
};

// Photo of a signature on paper: alpha grows continuously with how much darker each pixel is than the
// paper around it (antialiasing and thin strokes survive); the color is the ink's, with the paper
// taken out of the edges.
export const matteInk = (image: PixelImage): PixelImage => {
  const grid  = paperGrid(image);
  const data  = new Uint8ClampedArray(image.data.length);
  const paper = new Float32Array(4);

  for (let y = 0; y < image.height; y += 1) {
    for (let x = 0; x < image.width; x += 1) {
      paperAt(grid, [x, y], paper);

      const index    = (y * image.width + x) * 4;
      const shade    = luminance(image.data[index], image.data[index + 1], image.data[index + 2]);
      const darkness = (paper[0] - shade) / Math.max(paper[0], 1);
      const alpha    = smoothstep(MATTE.start, MATTE.full, darkness) * (image.data[index + 3] / 255);
      const divisor  = Math.max(alpha, 0.35);

      for (let channel = 0; channel < 3; channel += 1) {
        data[index + channel] = clamp((image.data[index + channel] - paper[channel + 1] * (1 - alpha)) / divisor, 0, 255);
      }

      data[index + 3] = Math.round(alpha * 255);
    }
  }

  return { data, width: image.width, height: image.height };
};

// Removes isolated dust: islands of ink that are tiny, or small and faint. Strokes, even thin ones, are
// long connected shapes and stay.
export const removeSpecks = (image: PixelImage): PixelImage => {
  const { width, height } = image;
  const data              = new Uint8ClampedArray(image.data);
  const seen              = new Uint8Array(width * height);
  const stack             = new Int32Array(width * height);

  for (let start = 0; start < width * height; start += 1) {
    if (seen[start] || data[start * 4 + 3] < SPECKS.alpha) continue;

    const members: number[] = [];
    let top                 = 0;
    let peak                = 0;
    stack[top++]            = start;
    seen[start]             = 1;

    while (top > 0) {
      const pixel = stack[--top];
      const x     = pixel % width;
      const y     = (pixel - x) / width;

      members.push(pixel);
      peak = Math.max(peak, data[pixel * 4 + 3]);

      for (let dy = -1; dy <= 1; dy += 1) {
        for (let dx = -1; dx <= 1; dx += 1) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;

          const next = ny * width + nx;
          if (seen[next] || data[next * 4 + 3] < SPECKS.alpha) continue;

          seen[next]   = 1;
          stack[top++] = next;
        }
      }
    }

    const dust = members.length <= SPECKS.tiny || (members.length <= SPECKS.small && peak < SPECKS.faint);
    if (dust) members.forEach((pixel) => (data[pixel * 4 + 3] = 0));
  }

  return { data, width, height };
};

// "Negro" or "Azul tinta": same alpha (same shape and antialiasing), new color.
export const recolor = ({ image, color }: RecolorParams): PixelImage => {
  const data = new Uint8ClampedArray(image.data);

  for (let index = 0; index < data.length; index += 4) {
    data[index]     = color[0];
    data[index + 1] = color[1];
    data[index + 2] = color[2];
  }

  return { data, width: image.width, height: image.height };
};

export const contentBounds = (image: PixelImage): Bounds | null => {
  let left   = image.width;
  let top    = image.height;
  let right  = -1;
  let bottom = -1;

  for (let y = 0; y < image.height; y += 1) {
    for (let x = 0; x < image.width; x += 1) {
      if (image.data[(y * image.width + x) * 4 + 3] < MIN_ALPHA) continue;

      left   = Math.min(left, x);
      top    = Math.min(top, y);
      right  = Math.max(right, x);
      bottom = Math.max(bottom, y);
    }
  }

  return right < 0 ? null : { left, top, width: right - left + 1, height: bottom - top + 1 };
};

// Trimmed to its strokes plus a small margin; null when there is nothing.
export const cropToContent = ({ image, padding }: CropParams): PixelImage | null => {
  const bounds = contentBounds(image);
  if (!bounds) return null;

  const left   = Math.max(0, bounds.left - padding);
  const top    = Math.max(0, bounds.top - padding);
  const width  = Math.min(image.width, bounds.left + bounds.width + padding) - left;
  const height = Math.min(image.height, bounds.top + bounds.height + padding) - top;
  const data   = new Uint8ClampedArray(width * height * 4);

  for (let y = 0; y < height; y += 1) {
    const start = ((top + y) * image.width + left) * 4;
    data.set(image.data.subarray(start, start + width * 4), y * width * 4);
  }

  return { data, width, height };
};

// The cut-out signature, before choosing a color.
export const extractSignature = (image: PixelImage): PixelImage => (hasRealTransparency(image) ? image : removeSpecks(matteInk(image)));

// "Subir foto": cut out (or used as is when already transparent), trimmed, and recolored only when asked.
export const prepareUpload = ({ image, color, padding }: PrepareParams): PixelImage | null => {
  const cropped = cropToContent({ image, padding });
  if (!cropped) return null;

  return color ? recolor({ image: cropped, color }) : cropped;
};
