import type { SplitMode } from '@/modules/pdf/types/splitMode';

// pages: 1-based, in the order of the new PDF (only for 'select').
export interface SplitOptions {
  mode  : SplitMode;
  pages : number[];
}
