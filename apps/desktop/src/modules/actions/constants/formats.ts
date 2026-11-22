import type { FormatOption } from '@/modules/actions/interfaces/formatOption';
import type { ImageFormat } from '@/modules/actions/types/imageFormat';

export const FORMAT_OPTIONS: FormatOption[] = [
  { format: 'webp', label: 'WebP', hint: 'Liviano, para web' },
  { format: 'jpg', label: 'JPG', hint: 'Para fotos' },
  { format: 'png', label: 'PNG', hint: 'Con transparencia' },
  { format: 'avif', label: 'AVIF', hint: 'El más liviano' },
  { format: 'ico', label: 'ICO', hint: 'Ícono' },
];

// File extensions that already are one of the target formats.
export const EXTENSION_FORMATS: Record<string, ImageFormat> = {
  webp : 'webp',
  jpg  : 'jpg',
  jpeg : 'jpg',
  png  : 'png',
  avif : 'avif',
  ico  : 'ico',
};
