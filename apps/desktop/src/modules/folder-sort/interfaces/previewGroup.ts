import type { PreviewFile } from '@/modules/folder-sort/interfaces/previewFile';

// One destination of the preview: "Imágenes" or "2026 › 11 - Noviembre", with its files.
export interface PreviewGroup {
  folder : string;
  count  : number;
  bytes  : number;
  files  : PreviewFile[];
}
