import { MAX_WATERMARK_TEXT, WATERMARK_PRESETS, WATERMARK_TEXTS } from '@/modules/pdf/constants/watermark';
import type { WatermarkPreset } from '@/modules/pdf/types/watermark';

interface WatermarkTextParams {
  preset : WatermarkPreset;
  custom : string;
}

// One trimmed line, cut at the limit, as Rust will draw it.
export const cleanWatermarkText = (text: string): string =>
  [...text.split(/\s+/).filter(Boolean).join(' ')].slice(0, MAX_WATERMARK_TEXT).join('');

export const watermarkText = ({ preset, custom }: WatermarkTextParams): string =>
  preset === 'custom' ? cleanWatermarkText(custom) : WATERMARK_PRESETS[preset];

export const watermarkProblem = (text: string): string | null => (text.length === 0 ? WATERMARK_TEXTS.empty : null);
