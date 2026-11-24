import type { PreviewGroup } from '@/modules/folder-sort/interfaces/previewGroup';
import type { SkippedFile } from '@/modules/folder-sort/interfaces/skippedFile';
import type { SortMode } from '@/modules/folder-sort/types/sortMode';

// What "Ordenar" would do, as Rust saw the folder: nothing has moved yet.
export interface SortPreview {
  folder  : string;
  // Descargas, or the folder's own name.
  name    : string;
  mode    : SortMode;
  groups  : PreviewGroup[];
  skipped : SkippedFile[];
  count   : number;
  bytes   : number;
}
