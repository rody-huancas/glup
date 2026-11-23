import type { PageId } from '@/modules/main-window/types/pageId';
import type { ToolBase } from '@/modules/tools/interfaces/toolBase';

// Opens another screen of the panel (Limpieza).
export interface PageTool extends ToolBase {
  kind : 'page';
  page : PageId;
}
