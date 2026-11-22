import type { ReduceLevel } from '@/modules/pdf/types/reduceLevel';

export interface ReduceChoice {
  level : ReduceLevel;
  label : string;
  hint  : string;
}
