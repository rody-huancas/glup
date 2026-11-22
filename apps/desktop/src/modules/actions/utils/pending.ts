import { DEFAULT_SKELETON_ACTIONS } from '@/modules/actions/constants/loading';
import { ACTIONS_TEXTS } from '@/modules/actions/constants/texts';
import type { PendingSelection } from '@/modules/actions/interfaces/pendingSelection';
import type { SelectionType } from '@/modules/actions/types/fileType';
import { getFileName } from '@/modules/actions/utils/paths';
import { getActionsFor } from '@/modules/actions/utils/selection';
import { getFileKind } from '@/modules/mascot/utils/fileKind';

// By extension: one kind for all, PDFs with images, otherwise several files are 'mixed' and a single unknown one is null.
const guessType = (paths: string[]): SelectionType | null => {
  const kinds = paths.map(getFileKind);
  const first = kinds[0] ?? null;

  if (first && kinds.every((kind) => kind === first)) return first;
  if (paths.length < 2) return null;
  return kinds.every((kind) => kind !== null) ? 'pdf-mixed' : 'mixed';
};

// Count, name and the number of action buttons are known right away, so the skeleton matches the panel.
export const createPendingSelection = (paths: string[]): PendingSelection => {
  const type = guessType(paths);

  return {
    paths,
    label       : paths.length === 1 ? getFileName(paths[0]) : ACTIONS_TEXTS.filesCount(paths.length),
    type,
    actionCount : type ? getActionsFor({ type, count: paths.length }).length : DEFAULT_SKELETON_ACTIONS,
  };
};
