import type { WatermarkOpacity, WatermarkPosition, WatermarkSize } from '@/modules/pdf/types/watermark';

// Sent to Rust as is (services/pdf/watermark.rs).
export interface WatermarkOptions {
  text     : string;
  size     : WatermarkSize;
  opacity  : WatermarkOpacity;
  position : WatermarkPosition;
}
