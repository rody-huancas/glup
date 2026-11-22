import { ACTIONS_TEXTS } from '@/modules/actions/constants/texts';
import type { FileSelection, SelectionSummary } from '@/modules/actions/interfaces/fileSelection';
import { formatFileSize } from '@/modules/actions/utils/fileSize';
import { PDF_TEXTS } from '@/modules/pdf/constants/pdf';

// Total pages when every file is a PDF with a known count.
const getPages = ({ files }: FileSelection): number | null =>
  files.every((file) => file.pages !== null) ? files.reduce((total, file) => total + (file.pages ?? 0), 0) : null;

// "contrato.pdf · 12 páginas · 1,2 MB" or "3 archivos · 24 páginas · 4 MB".
export const getSelectionSummary = (selection: FileSelection): SelectionSummary => {
  const { files } = selection;
  const totalSize = files.reduce((total, file) => total + file.size, 0);
  const pages     = getPages(selection);
  const pagesPart = pages === null ? '' : ` · ${PDF_TEXTS.pagesCount(pages)}`;

  if (files.length === 1) {
    return { label: `${files[0].name}${pagesPart}`, size: formatFileSize(totalSize) };
  }

  return { label: `${ACTIONS_TEXTS.filesCount(files.length)}${pagesPart} · ${formatFileSize(totalSize)}`, size: null };
};

// export const getSelectionSummary = ({ files }: FileSelection): SelectionSummary => {
//   const totalSize = files.reduce((total, file) => total + file.size, 0);
//
//   if (files.length === 1) {
//     return { label: files[0].name, size: formatFileSize(totalSize) };
//   }
//
//   return { label: `${ACTIONS_TEXTS.filesCount(files.length)} · ${formatFileSize(totalSize)}`, size: null };
// };

export const getActionsTitle = ({ files }: FileSelection): string =>
  files.length > 1 ? ACTIONS_TEXTS.titleMultiple : ACTIONS_TEXTS.titleSingle;
