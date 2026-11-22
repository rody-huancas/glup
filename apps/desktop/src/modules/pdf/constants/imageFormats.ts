import type { PageImageOption } from '@/modules/pdf/interfaces/pageImageOption';

export const PAGE_IMAGE_OPTIONS: PageImageOption[] = [
  { format: 'jpg', label: 'JPG', hint: 'Más liviano', mime: 'image/jpeg' },
  { format: 'png', label: 'PNG', hint: 'Máxima calidad', mime: 'image/png' },
];
