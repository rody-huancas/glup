import type { UpscaleLevel } from '@/modules/upscale/types/upscaleLevel';

// UpscaleOptions in services/upscale.
export interface UpscaleOptions {
  level : UpscaleLevel;
  // 1: «Mismo tamaño» (sharper, less noise, as big as it was).
  scale : 1 | 2 | 4;
}
