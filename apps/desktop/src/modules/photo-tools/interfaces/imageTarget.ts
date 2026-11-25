import type { ImageScreen } from '@/modules/photo-tools/types/imageScreen';

// The photos a screen of Imágenes works on, in the order they came.
export interface ImageTarget {
  screen : ImageScreen;
  paths  : string[];
}
