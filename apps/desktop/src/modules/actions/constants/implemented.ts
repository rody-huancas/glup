import type { FileInfo } from '@/modules/actions/interfaces/fileInfo';
import type { ActionId } from '@/modules/actions/types/actionId';
import type { SelectionType } from '@/modules/actions/types/fileType';
import { allHeic } from '@/modules/photos/utils/photos';
import { isWindows } from '@/shared/utils/platform';

// Actions that really run; the rest still answer "Esto lo aprendo pronto".
export const IMPLEMENTED_ACTIONS: Record<SelectionType, ActionId[]> = {
  image       : ['convert', 'to-jpg', 'compress', 'to-pdf', 'scan', 'remove-background', 'extract-text', 'id-photo', 'zip'],
  pdf         : ['merge', 'compress', 'sign', 'split-pages', 'organize-pages', 'to-images', 'protect', 'watermark', 'page-numbers', 'extract-images', 'extract-text', 'zip'],
  'pdf-mixed' : ['merge', 'extract-text', 'zip'],
  'pdf-locked': ['unlock'],
  video       : ['compress', 'transcribe', 'extract-audio', 'trim', 'zip'],
  audio       : ['transcribe', 'trim', 'zip'],
  mixed       : ['zip'],
};

// Results that can be delivered in one zip: one per file (2 or more files)…
export const BUNDLE_ACTIONS: ActionId[] = ['convert', 'to-jpg', 'compress', 'remove-background', 'protect', 'watermark', 'page-numbers', 'extract-audio'];

// …or several files out of a single PDF.
export const PAGE_BUNDLE_ACTIONS: ActionId[] = ['split-pages', 'to-images', 'extract-images'];

// Actions that only exist on some systems: "Sacar texto" uses the OCR that comes with Windows.
export const PLATFORM_ACTIONS: Partial<Record<ActionId, () => boolean>> = {
  'extract-text': () => isWindows(),
  // The face detector of Windows.
  'id-photo'    : () => isWindows(),
};

// Actions that depend on the files themselves: "A JPG" (Fotos de iPhone a JPG) only for HEIC and HEIF.
export const FILE_ACTIONS: Partial<Record<ActionId, (files: FileInfo[]) => boolean>> = {
  'to-jpg': allHeic,
};
