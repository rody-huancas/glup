import { ID_PHOTO_TEXTS, MAX_CUSTOM_CM, MIN_CUSTOM_CM } from '@/modules/id-photo/constants/idPhoto';
import type { IdChoice } from '@/modules/id-photo/interfaces/idChoice';

interface CustomSizeParams {
  width  : string;
  height : string;
}

// "3,5" or "3.5" cm; anything else (empty, letters, 0) is null.
export const parseCm = (text: string): number | null => {
  const value = Number(text.trim().replace(',', '.'));
  return text.trim() !== '' && Number.isFinite(value) && value > 0 ? value : null;
};

const fits = (value: number | null): boolean => value !== null && value >= MIN_CUSTOM_CM && value <= MAX_CUSTOM_CM;

// Why a custom size cannot be used, or null.
export const customSizeProblem = ({ width, height }: CustomSizeParams): string | null =>
  fits(parseCm(width)) && fits(parseCm(height)) ? null : ID_PHOTO_TEXTS.badSize;

export const choiceProblem = (choice: IdChoice): string | null =>
  choice.outputs.photo || choice.outputs.sheet ? null : ID_PHOTO_TEXTS.noOutput;
