import type { WatermarkOptions } from '@/modules/pdf/interfaces/watermarkOptions';
import type { WatermarkOpacity, WatermarkPosition, WatermarkPreset, WatermarkSize } from '@/modules/pdf/types/watermark';

// Same limit as Rust (services/pdf/watermark.rs).
export const MAX_WATERMARK_TEXT = 40;

export const WATERMARK_TEXTS = {
  title       : 'Marca de agua',
  text        : 'Texto',
  customField : 'Tu texto para la marca de agua',
  placeholder : 'Escribe el texto',
  size        : 'Tamaño',
  opacity     : 'Transparencia',
  position    : 'Posición',
  preview     : 'Así se verá la primera página',
  button      : 'Poner marca de agua',
  empty       : 'Escribe el texto de la marca',
};

export const WATERMARK_PRESETS: Record<WatermarkPreset, string> = {
  copy         : 'COPIA',
  draft        : 'BORRADOR',
  confidential : 'CONFIDENCIAL',
  custom       : 'Otro',
};

export const PRESET_ORDER: WatermarkPreset[] = ['copy', 'draft', 'confidential', 'custom'];

export const SIZE_LABELS: Record<WatermarkSize, string> = {
  small  : 'Pequeño',
  medium : 'Mediano',
  large  : 'Grande',
};

export const OPACITY_LABELS: Record<WatermarkOpacity, string> = {
  soft   : 'Suave',
  medium : 'Media',
  strong : 'Fuerte',
};

export const POSITION_LABELS: Record<WatermarkPosition, string> = {
  diagonal : 'En diagonal',
  corner   : 'Abajo a la derecha',
};

export const DEFAULT_WATERMARK: Omit<WatermarkOptions, 'text'> = { size: 'medium', opacity: 'medium', position: 'diagonal' };

// The preview follows the same numbers as Rust: the share of the diagonal the text spans, the corner
// font size in points and the fill opacity.
export const DIAGONAL_SHARE: Record<WatermarkSize, number>   = { small: 0.45, medium: 0.65, large: 0.85 };
export const CORNER_SIZE: Record<WatermarkSize, number>      = { small: 12, medium: 18, large: 26 };
export const OPACITY_ALPHA: Record<WatermarkOpacity, number> = { soft: 0.15, medium: 0.3, strong: 0.5 };
// Points from the edges in the corner position.
export const CORNER_MARGIN = 28;
