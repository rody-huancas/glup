import type { ResultTone } from '@/modules/actions/types/resultTone';

// The result of a task that does not produce files (Limpieza), as Rust describes it.
export interface TaskSummary {
  tone    : ResultTone;
  message : string;
  note    : string | null;
}
