import { FILE_EXTENSIONS, FILE_KINDS } from '@/modules/mascot/constants/files';
import type { FileKind } from '@/modules/mascot/types/fileKind';

const getExtension = (path: string): string => {
  const name = path.split(/[\\/]/).pop() ?? '';
  const dot  = name.lastIndexOf('.');

  return dot === -1 ? '' : name.slice(dot + 1).toLowerCase();
};

export const getFileKind = (path: string): FileKind | null => {
  const extension = getExtension(path);

  return FILE_KINDS.find((kind) => FILE_EXTENSIONS[kind].includes(extension)) ?? null;
};
