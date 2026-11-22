import { ACTIONS_TEXTS } from '@/modules/actions/constants/texts';
import type { FileSelection, SelectionSummary } from '@/modules/actions/interfaces/fileSelection';
import { formatFileSize } from '@/modules/actions/utils/fileSize';

export const getSelectionSummary = ({ files }: FileSelection): SelectionSummary => {
  const totalSize = files.reduce((total, file) => total + file.size, 0);

  if (files.length === 1) {
    return { label: files[0].name, size: formatFileSize(totalSize) };
  }

  return { label: `${ACTIONS_TEXTS.filesCount(files.length)} · ${formatFileSize(totalSize)}`, size: null };
};

export const getActionsTitle = ({ files }: FileSelection): string =>
  files.length > 1 ? ACTIONS_TEXTS.titleMultiple : ACTIONS_TEXTS.titleSingle;
