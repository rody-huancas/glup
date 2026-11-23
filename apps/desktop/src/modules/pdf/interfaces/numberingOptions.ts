import type { NumberFormat, NumberPosition } from '@/modules/pdf/types/numbering';

// Sent to Rust as is (services/pdf/numbering.rs).
export interface NumberingOptions {
  position    : NumberPosition;
  format      : NumberFormat;
  // The first page that gets a number (1-based): the ones before it, like a cover, stay as they are.
  startPage   : number;
  // The number written on that page.
  firstNumber : number;
}
