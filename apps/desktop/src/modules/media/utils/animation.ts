import type { AnimationFormat } from '@/modules/media/types/animationFormat';

export const GIF_WIDTHS = [320, 480, 640];
export const GIF_FPS = [10, 15, 20];
// A longer stretch is allowed, with a warning: it weighs a lot.
export const SUGGESTED_SECONDS = 15;
// Over this the screen suggests less width or fewer frames.
export const HEAVY_BYTES = 8 * 1024 * 1024;

// Bytes for each pixel of each frame, measured on busy test videos (a calm one weighs less; the first
// preview corrects it for this video).
const BYTES_PER_PIXEL: Record<AnimationFormat, number> = { gif: 0.25, webp: 0.05 };

// 320, 480 and 640 when the video is wider; its own width when it is narrower than one of them.
export const widthChoices = (source: number): number[] => {
  const fitting = GIF_WIDTHS.filter((width) => width <= source);
  return source > 0 && source < GIF_WIDTHS[GIF_WIDTHS.length - 1] && !fitting.includes(source) ? [...fitting, source] : fitting.length > 0 ? fitting : GIF_WIDTHS;
};

// 480 when it can, otherwise the widest there is.
export const defaultWidth = (choices: number[]): number => (choices.includes(480) ? 480 : choices[choices.length - 1]);

interface EstimateParams {
  format       : AnimationFormat;
  width        : number;
  sourceWidth  : number;
  sourceHeight : number;
  fps          : number;
  seconds      : number;
  // The real weight of a preview of this video against its estimate (1 until there is one).
  factor       : number;
}

// What the animation will weigh, from its pixels, its frames and the format.
export const estimateBytes = ({ format, width, sourceWidth, sourceHeight, fps, seconds, factor }: EstimateParams): number => {
  const shown  = Math.min(width, sourceWidth || width);
  const height = sourceWidth > 0 ? Math.round((shown * sourceHeight) / sourceWidth / 2) * 2 : Math.round((shown * 9) / 16);
  return Math.round(shown * height * fps * Math.max(0, seconds) * BYTES_PER_PIXEL[format] * factor);
};

// How far the last estimate was from the real preview, to correct the next ones of this video.
export const correction = (real: number, estimated: number): number => (estimated > 0 && real > 0 ? Math.min(4, Math.max(0.1, real / estimated)) : 1);
