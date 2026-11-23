import type { ResultTone } from '@/modules/actions/types/resultTone';

export interface IslandNotice {
  message  : string;
  tone     : ResultTone;
  // A history line the notice can open with "Ver" (Copiar texto de la pantalla).
  entryId? : string | null;
}
