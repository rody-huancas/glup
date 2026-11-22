import { TEXT_FONT } from '@/modules/sign/constants/sign';
import type { TextMeasure } from '@/modules/sign/utils/placements';

let context: CanvasRenderingContext2D | null = null;

// Width in points: measured in a canvas with the font size in pixels, which is the same unit.
export const measureText: TextMeasure = (text, fontSize) => {
  context ??= document.createElement('canvas').getContext('2d');
  if (!context) return text.length * fontSize * 0.55;

  context.font = `${fontSize}px ${TEXT_FONT}`;
  return context.measureText(text).width;
};
