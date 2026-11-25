import type { ActionId } from '@/modules/actions/types/actionId';
import type { PageId } from '@/modules/main-window/types/pageId';
import type { ToolBase } from '@/modules/tools/interfaces/toolBase';

// Opens another screen of the panel (Limpieza).
export interface PageTool extends ToolBase {
  kind      : 'page';
  page      : PageId;
  // Files can come to that screen too (the right click's «Leer QR»): the action that opens it with them.
  actionId? : ActionId;
}
