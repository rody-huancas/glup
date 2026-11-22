import type { ReduceLevel } from '@/modules/pdf/types/reduceLevel';

// targetBytes: "Necesito que pese menos de…", tried from Normal upwards.
export interface ReduceOptions {
  level       : ReduceLevel;
  targetBytes : number | null;
}
