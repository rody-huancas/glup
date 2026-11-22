import { ACTIONS } from '@/modules/actions/constants/actions';
import type { ActionDefinition } from '@/modules/actions/interfaces/actionDefinition';
import type { FileInfo } from '@/modules/actions/interfaces/fileInfo';
import type { FileSelection } from '@/modules/actions/interfaces/fileSelection';
import type { FileCount } from '@/modules/actions/types/fileCount';
import type { SupportedFileType } from '@/modules/actions/types/fileType';

interface ActionsForParams {
  type  : SupportedFileType;
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

export const getSelectionType = (files: FileInfo[]): SupportedFileType | null => {
  const first = files[0]?.kind;

  if (!first || first === 'other') return null;
  return files.every((file) => file.kind === first) ? first : null;
};

export const getActionsFor = ({ type, count }: ActionsForParams): ActionDefinition[] =>
  ACTIONS
    .filter((action) => action.fileType === type && matchesCount(action.fileCount, count))
    .sort((a, b) => Number(b.primary) - Number(a.primary));

export const createSelection = ({ paths, files }: CreateSelectionParams): FileSelection | null => {
  const type = getSelectionType(files);
  if (!type) return null;

  const actions = getActionsFor({ type, count: files.length });
  if (actions.length === 0) return null;

  return { paths, files, type, actions };
};
