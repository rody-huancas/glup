import type { JpgQuality } from '@/modules/photos/types/jpgQuality';

export interface JpgQualityOption {
  quality : JpgQuality;
  label   : string;
  hint    : string;
}
