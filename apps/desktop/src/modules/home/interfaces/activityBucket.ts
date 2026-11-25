import type { FamilyId } from '@/modules/families/types/familyId';

// One bar of the chart: its span (ms, end excluded), its words and what each family did in it.
export interface ActivityBucket {
  start  : number;
  end    : number;
  // Under the bar ("mar", "17 nov", "jun") and in its balloon ("Martes", "Semana del 17 nov", "Junio").
  label  : string;
  title  : string;
  counts : Record<FamilyId, number>;
  total  : number;
}
