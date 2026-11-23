import { ACTIONS } from '@/modules/actions/constants/actions';
import type { ActionDefinition } from '@/modules/actions/interfaces/actionDefinition';
import type { FileInfo } from '@/modules/actions/interfaces/fileInfo';
import type { FileSelection } from '@/modules/actions/interfaces/fileSelection';
import type { FileCount } from '@/modules/actions/types/fileCount';
import type { SelectionType } from '@/modules/actions/types/fileType';

interface ActionsForParams {
  type  : SelectionType;
  count : number;
}

interface CreateSelectionParams {
  paths : string[];
  files : FileInfo[];
}

const matchesCount = (fileCount: FileCount, count: number): boolean => {
  if (fileCount === 'any') return count > 0;
  return fileCount === 'multiple' ? count > 1 : count === 1;
};

// One kind for all; PDFs with images are 'pdf-mixed' (they can be merged); anything else is null.
export const getSelectionType = (files: FileInfo[]): Exclude<SelectionType, 'mixed'> | null => {
  const first = files[0]?.kind;

  if (!first || first === 'other') return null;
  if (files.every((file) => file.kind === first)) return first;
  // Only PDFs with images can be merged; videos with anything else are 'mixed' (Juntar en ZIP).
  return files.every((file) => file.kind === 'pdf' || file.kind === 'image') ? 'pdf-mixed' : null;
  // return files.every((file) => file.kind !== 'other') ? 'pdf-mixed' : null;
};

// export const getSelectionType = (files: FileInfo[]): SupportedFileType | null => {
//   const first = files[0]?.kind;
//
//   if (!first || first === 'other') return null;
//   return files.every((file) => file.kind === first) ? first : null;
// };

export const getActionsFor = ({ type, count }: ActionsForParams): ActionDefinition[] =>
  ACTIONS
    .filter((action) => (action.fileType === type || action.fileType === 'any') && matchesCount(action.fileCount, count))
    // .filter((action) => action.fileType === type && matchesCount(action.fileCount, count))
    .sort((a, b) => Number(b.primary) - Number(a.primary));

// Two or more files of mixed or unsupported kinds still make a selection, with only the actions for any type.
export const createSelection = ({ paths, files }: CreateSelectionParams): FileSelection | null => {
  // A PDF that needs a password cannot be opened: the only thing to do is remove it.
  const locked = files.length === 1 && files[0].kind === 'pdf' && files[0].protected;
  const type   = locked ? 'pdf-locked' : getSelectionType(files) ?? (files.length >= 2 ? 'mixed' : null);
  // const type = getSelectionType(files) ?? (files.length >= 2 ? 'mixed' : null);
  if (!type) return null;

  const actions = getActionsFor({ type, count: files.length });
  if (actions.length === 0) return null;

  return { paths, files, type, actions };
};
