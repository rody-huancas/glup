import type { ResultTone } from '@/modules/actions/types/resultTone';

export interface ActionResult {
  tone        : ResultTone;
  message     : string;
  note        : string | null;
  failedNames : string[];
  openPath    : string | null;
  revealPath  : string | null;
  // A folder of results: "Ver en carpeta" opens it instead of showing it selected.
  revealOpens : boolean;
}
