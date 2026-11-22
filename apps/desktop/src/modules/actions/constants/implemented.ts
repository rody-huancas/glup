import type { ActionId } from '@/modules/actions/types/actionId';
import type { SelectionType } from '@/modules/actions/types/fileType';

// Actions that really run in Rust; the rest still answer "Esto lo aprendo pronto".
export const IMPLEMENTED_ACTIONS: Record<SelectionType, ActionId[]> = {
  image : ['convert', 'compress', 'to-pdf', 'zip'],
  pdf   : ['zip'],
  mixed : ['zip'],
};

// Actions whose results can be delivered together in one zip.
export const BUNDLE_ACTIONS: ActionId[] = ['convert', 'compress'];
