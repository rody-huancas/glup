import type { FileKind } from '@/modules/mascot/types/fileKind';
import type { PieceName } from '@/modules/mascot/types/pieceName';

export const FILE_KINDS: FileKind[] = ['pdf', 'image'];

export const FILE_PIECES: Record<FileKind, PieceName> = {
  pdf   : 'file-pdf',
  image : 'file-image',
};

export const FILE_EXTENSIONS: Record<FileKind, string[]> = {
  pdf   : ['pdf'],
  image : ['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp', 'tif', 'tiff', 'avif'],
};
