import type { OrganizedPage } from '@/modules/organize/interfaces/organizedPage';

// The pages as they are now, and the versions before and after them for "Deshacer" and "Rehacer".
export interface EditorState {
  pages  : OrganizedPage[];
  past   : OrganizedPage[][];
  future : OrganizedPage[][];
}
