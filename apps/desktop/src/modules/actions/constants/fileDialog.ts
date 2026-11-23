import type { DialogFilter } from '@tauri-apps/plugin-dialog';
import { VIDEO_EXTENSIONS } from '@/modules/actions/constants/video';
import type { DialogFileType } from '@/modules/actions/types/fileType';
import { FILE_EXTENSIONS } from '@/modules/mascot/constants/files';

const PDF_FILTER: DialogFilter   = { name: 'PDF', extensions: FILE_EXTENSIONS.pdf };
const IMAGE_FILTER: DialogFilter = { name: 'Imágenes', extensions: FILE_EXTENSIONS.image };
const VIDEO_FILTER: DialogFilter = { name: 'Videos', extensions: VIDEO_EXTENSIONS };

const ANY_FILTER: DialogFilter = {
  name       : 'PDF, imágenes y videos',
  extensions : [...FILE_EXTENSIONS.pdf, ...FILE_EXTENSIONS.image, ...VIDEO_EXTENSIONS],
};

// const ANY_FILTER: DialogFilter = {
//   name       : 'PDF e imágenes',
//   extensions : [...FILE_EXTENSIONS.pdf, ...FILE_EXTENSIONS.image],
// };

export const DIALOG_FILTERS: Record<DialogFileType, DialogFilter[]> = {
  pdf   : [PDF_FILTER],
  image : [IMAGE_FILTER],
  video : [VIDEO_FILTER],
  any   : [ANY_FILTER, PDF_FILTER, IMAGE_FILTER, VIDEO_FILTER],
  // any   : [ANY_FILTER, PDF_FILTER, IMAGE_FILTER],
  files : [],
};
