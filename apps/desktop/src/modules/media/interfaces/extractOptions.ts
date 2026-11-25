import type { AudioFormat, AudioQuality } from '@/modules/media/types/audioFormat';

export interface ExtractOptions {
  format  : AudioFormat;
  quality : AudioQuality;
}
