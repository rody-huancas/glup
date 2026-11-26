import type { WeekStatKind } from '@/modules/home/types/weekStatKind';

// One number of «Esta semana hicimos».
export interface WeekStat {
  kind  : WeekStatKind;
  value : number;
}
