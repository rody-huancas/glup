import type { PageId } from '@/modules/main-window/types/pageId';

// Owner screen of each task kind, to restore tasks after a reload (Rust only knows the action id).
// Actions on files belong to Inicio, which shows their result card.
export const DEFAULT_OWNER: PageId = 'home';

export const ACTION_OWNERS: Partial<Record<string, PageId>> = {
  'cleanup-scan' : 'cleanup',
  cleanup        : 'cleanup',
};
