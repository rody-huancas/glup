import { KIND_EXTENSIONS } from '@/modules/duplicates/constants/kinds';
import type { DuplicateGroup } from '@/modules/duplicates/interfaces/duplicateGroup';
import type { FileKind } from '@/modules/duplicates/types/fileKind';

const extensionOf = (path: string): string => path.split(/[\\/]/).pop()?.split('.').pop()?.toLowerCase() ?? '';

export const kindOf = (path: string): Exclude<FileKind, 'all'> => {
  const extension = extensionOf(path);
  if (KIND_EXTENSIONS.photos.includes(extension)) return 'photos';
  if (KIND_EXTENSIONS.videos.includes(extension)) return 'videos';
  if (KIND_EXTENSIONS.documents.includes(extension)) return 'documents';
  return 'other';
};

// The folder of a file ("C:\\Users\\Ana\\Fotos").
export const folderOf = (path: string): string => path.replace(/[\\/][^\\/]*$/, '');

// Which of the folders searched a file is in (the longest that contains it).
export const rootOf = (path: string, roots: string[]): string | null => {
  const lower = path.toLowerCase();
  const found = roots.filter((root) => lower.startsWith(`${root.toLowerCase().replace(/[\\/]+$/, '')}\\`) || lower.startsWith(`${root.toLowerCase().replace(/[\\/]+$/, '')}/`));
  return found.sort((a, b) => b.length - a.length)[0] ?? null;
};

interface FilterParams {
  groups : DuplicateGroup[];
  kind   : FileKind;
  // One of the folders searched (null: all).
  root   : string | null;
}

// The groups of that type with a copy in that folder.
export const filterGroups = ({ groups, kind, root }: FilterParams): DuplicateGroup[] =>
  groups.filter((group) =>
    (kind === 'all' || kindOf(group.files[0].path) === kind) &&
    (root === null || group.files.some((file) => rootOf(file.path, [root]) !== null)));

export const fileName = (path: string): string => path.split(/[\\/]/).pop() ?? path;
