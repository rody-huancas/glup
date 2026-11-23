import { CROP_PADDING, DRAW_CANVAS, TEXT_FONT, TYPED_FONT_SIZE } from '@/modules/sign/constants/sign';
import type { Size } from '@/modules/sign/interfaces/geometry';
import type { PixelImage } from '@/modules/sign/interfaces/pixelImage';
import { cropToContent } from '@/modules/sign/utils/ink';
import { strokePath } from '@/modules/sign/utils/strokes';
import type { StrokePoints } from '@/modules/sign/utils/strokes';

interface StrokesImageParams {
  strokes : StrokePoints[];
  color   : string;
}

interface TypedImageParams {
  text   : string;
  family : string;
  color  : string;
}

const createCanvas = (width: number, height: number): HTMLCanvasElement => {
  const canvas  = document.createElement('canvas');
  canvas.width  = Math.max(1, Math.ceil(width));
  canvas.height = Math.max(1, Math.ceil(height));
  return canvas;
};

const toPixels = (canvas: HTMLCanvasElement): PixelImage | null => {
  const context = canvas.getContext('2d');
  if (!context) return null;

  const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
  return { data, width: canvas.width, height: canvas.height };
};

// The finished signature: a transparent PNG trimmed to its strokes.
export const pixelsToPng = (image: PixelImage): Promise<Uint8Array> => {
  const canvas  = createCanvas(image.width, image.height);
  const context = canvas.getContext('2d');
  context?.putImageData(new ImageData(new Uint8ClampedArray(image.data), image.width, image.height), 0, 0);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) return reject(new Error('png'));
      void blob.arrayBuffer().then((buffer) => resolve(new Uint8Array(buffer)));
    }, 'image/png');
  });
};

export const pixelsToUrl = async (image: PixelImage): Promise<string> =>
  URL.createObjectURL(new Blob([(await pixelsToPng(image)).slice().buffer], { type: 'image/png' }));

const trimmed = (canvas: HTMLCanvasElement): PixelImage | null => {
  const pixels = toPixels(canvas);
  return pixels ? cropToContent({ image: pixels, padding: CROP_PADDING }) : null;
};

export const fillStrokes = (context: CanvasRenderingContext2D, strokes: StrokePoints[]) => {
  strokes.forEach((points) => {
    const path = strokePath(points);
    if (path) context.fill(new Path2D(path));
  });
};

// "Dibujar", at twice the canvas size for a sharp print.
export const strokesToImage = ({ strokes, color }: StrokesImageParams): PixelImage | null => {
  const scale   = DRAW_CANVAS.exportScale;
  const canvas  = createCanvas(DRAW_CANVAS.width * scale, DRAW_CANVAS.height * scale);
  const context = canvas.getContext('2d');
  if (!context) return null;

  context.scale(scale, scale);
  context.fillStyle = color;
  fillStrokes(context, strokes);
  return trimmed(canvas);
};

// "Escribir": the name in the chosen handwriting font (loaded first, so it is not drawn in a fallback).
export const typedToImage = async ({ text, family, color }: TypedImageParams): Promise<PixelImage | null> => {
  const font = `${TYPED_FONT_SIZE}px "${family}", ${TEXT_FONT}`;
  await document.fonts.load(font, text);

  const probe   = createCanvas(1, 1).getContext('2d');
  if (!probe) return null;
  probe.font    = font;

  const canvas  = createCanvas(probe.measureText(text).width + TYPED_FONT_SIZE, TYPED_FONT_SIZE * 1.8);
  const context = canvas.getContext('2d');
  if (!context) return null;

  context.font         = font;
  context.fillStyle    = color;
  context.textBaseline = 'middle';
  context.fillText(text, TYPED_FONT_SIZE / 2, canvas.height / 2);
  return trimmed(canvas);
};

// "Subir foto": the image at its full resolution, with its transparency as it is.
export const fileToPixels = async (file: File): Promise<PixelImage | null> => {
  const bitmap  = await createImageBitmap(file, { premultiplyAlpha: 'none', colorSpaceConversion: 'none' });
  const canvas  = createCanvas(bitmap.width, bitmap.height);
  const context = canvas.getContext('2d');

  context?.drawImage(bitmap, 0, 0);
  bitmap.close();
  return toPixels(canvas);
};

export const imageSize = (url: string): Promise<Size> =>
  new Promise((resolve, reject) => {
    const image   = new Image();
    image.onload  = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
    image.onerror = () => reject(new Error('image'));
    image.src     = url;
  });
