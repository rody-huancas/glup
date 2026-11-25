import type { ResultTone } from '@/modules/actions/types/resultTone';
import type { PageId } from '@/modules/main-window/types/pageId';

export interface IslandNotice {
  message  : string;
  tone     : ResultTone;
  // A history line the notice can open with "Ver" (Copiar texto de la pantalla).
  entryId? : string | null;
  // Or a screen it opens with "Ver" (the codes found: Leer un QR).
  page?    : PageId | null;
}
