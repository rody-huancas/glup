import { familyOfPage, familyPage } from '@/modules/families/utils/families';
import type { PageId } from '@/modules/main-window/types/pageId';

// The screens of a tool that is a screen of its own go back to their family.
const TOOL_PARENTS: Partial<Record<PageId, PageId>> = {
  'cleanup'     : familyPage('pc'),
  'folder-sort' : familyPage('pc'),
  'performance' : familyPage('pc'),
  'duplicates'  : familyPage('pc'),
  'space'       : familyPage('pc'),
  'batch-rename': familyPage('pc'),
  'clipboard'   : familyPage('clipboard'),
  'qr-create'   : familyPage('text'),
  'qr-read'     : familyPage('text'),
};

// Where "←" goes from a screen: a family to Habilidades, a tool's screen to its family; the screens of
// the bar (Inicio, Habilidades, Historial, Ajustes) have none.
export const backTarget = (page: PageId): PageId | null => {
  if (familyOfPage(page)) return 'tools';
  return TOOL_PARENTS[page] ?? null;
};
