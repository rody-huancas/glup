import type { ActionId } from '@/modules/actions/types/actionId';
import type { SelectionType } from '@/modules/actions/types/fileType';

// Actions that really run; the rest still answer "Esto lo aprendo pronto".
export const IMPLEMENTED_ACTIONS: Record<SelectionType, ActionId[]> = {
  image       : ['convert', 'compress', 'to-pdf', 'remove-background', 'zip'],
  // image       : ['convert', 'compress', 'to-pdf', 'zip'],
  pdf         : ['merge', 'compress', 'sign', 'split-pages', 'organize-pages', 'to-images', 'zip'],
  // pdf         : ['merge', 'compress', 'sign', 'split-pages', 'to-images', 'zip'],
  // pdf         : ['merge', 'compress', 'split-pages', 'to-images', 'zip'],
  'pdf-mixed' : ['merge', 'zip'],
  mixed       : ['zip'],
};

// export const IMPLEMENTED_ACTIONS: Record<SelectionType, ActionId[]> = {
//   image : ['convert', 'compress', 'to-pdf', 'zip'],
//   pdf   : ['zip'],
//   mixed : ['zip'],
// };

// Results that can be delivered in one zip: one per file (2 or more files)…
export const BUNDLE_ACTIONS: ActionId[] = ['convert', 'compress', 'remove-background'];
// export const BUNDLE_ACTIONS: ActionId[] = ['convert', 'compress'];

// …or several files out of a single PDF.
export const PAGE_BUNDLE_ACTIONS: ActionId[] = ['split-pages', 'to-images'];
