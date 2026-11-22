import type { SupportedFileType } from '@/modules/actions/types/fileType';
import { PIECE_ASSETS } from '@/modules/mascot/constants/assets';

export const getFileIcon = (type: SupportedFileType): string =>
  type === 'pdf' ? PIECE_ASSETS['file-pdf'] : PIECE_ASSETS['file-image'];
