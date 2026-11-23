import type { SelectionType, SupportedFileType } from '@/modules/actions/types/fileType';
import { PIECE_ASSETS } from '@/modules/mascot/constants/assets';

// Glup's file artwork exists for PDFs and images; videos use the image one.
export const getFileIcon = (type: SupportedFileType): string =>
  type === 'pdf' ? PIECE_ASSETS['file-pdf'] : PIECE_ASSETS['file-image'];

// Mixed selections and zips have no artwork: the chip shows a generic file icon instead.
export const getSelectionIcon = (type: SelectionType | 'zip'): string | null => {
  if (type === 'pdf' || type === 'pdf-mixed' || type === 'pdf-locked') return getFileIcon('pdf');
  return type === 'image' ? getFileIcon(type) : null;
};
