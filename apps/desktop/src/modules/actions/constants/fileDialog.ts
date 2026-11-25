import type { DialogFilter } from '@tauri-apps/plugin-dialog';
import { AUDIO_EXTENSIONS, VIDEO_EXTENSIONS } from '@/modules/actions/constants/video';
import type { DialogFileType } from '@/modules/actions/types/fileType';
import { FILE_EXTENSIONS } from '@/modules/mascot/constants/files';
import { HEIC_EXTENSIONS } from '@/modules/photos/constants/photos';

const PDF_FILTER: DialogFilter   = { name: 'PDF', extensions: FILE_EXTENSIONS.pdf };
const IMAGE_FILTER: DialogFilter = { name: 'Imágenes', extensions: FILE_EXTENSIONS.image };
const VIDEO_FILTER: DialogFilter = { name: 'Videos', extensions: VIDEO_EXTENSIONS };
const AUDIO_FILTER: DialogFilter = { name: 'Audios', extensions: AUDIO_EXTENSIONS };
const PHOTO_FILTER: DialogFilter = { name: 'Fotos de iPhone', extensions: HEIC_EXTENSIONS };

const MEDIA_FILTER: DialogFilter = { name: 'Videos y audios', extensions: [...VIDEO_EXTENSIONS, ...AUDIO_EXTENSIONS] };

const ANY_FILTER: DialogFilter = {
  name       : 'PDF, imágenes, videos y audios',
  extensions : [...FILE_EXTENSIONS.pdf, ...FILE_EXTENSIONS.image, ...VIDEO_EXTENSIONS, ...AUDIO_EXTENSIONS],
};

export const DIALOG_FILTERS: Record<DialogFileType, DialogFilter[]> = {
  pdf   : [PDF_FILTER],
  image : [IMAGE_FILTER],
  video : [VIDEO_FILTER],
  audio : [AUDIO_FILTER, VIDEO_FILTER],
  any   : [ANY_FILTER, PDF_FILTER, IMAGE_FILTER, VIDEO_FILTER, AUDIO_FILTER],
  files  : [],
  iphone : [PHOTO_FILTER, IMAGE_FILTER],
  media  : [MEDIA_FILTER, VIDEO_FILTER, AUDIO_FILTER],
};
