import type { ActionProgress } from '@/modules/actions/interfaces/actionReport';
import type { ActionResult } from '@/modules/actions/interfaces/actionResult';
import type { FileInfo } from '@/modules/actions/interfaces/fileInfo';
import { PAGE_RENDER_SCALE } from '@/modules/pdf/constants/pdf';
import { loadPdf } from '@/modules/pdf/services/pdfDocument';
import { canvasToBytes, renderPage } from '@/modules/pdf/utils/renderPage';
import type { SaveDestination } from '@/modules/settings/interfaces/appSettings';
import { TEXT_TEXTS } from '@/modules/text/constants/texts';
import type { FileText } from '@/modules/text/interfaces/fileText';
import { finishText, readImageText, readPageText } from '@/modules/text/services/text';
import { hasSelectableText, textFromItems } from '@/modules/text/utils/pdfText';
import { toTextResult } from '@/modules/text/utils/textResult';

interface ExtractTextParams {
  files       : FileInfo[];
  destination : SaveDestination;
  onProgress  : (progress: ActionProgress) => void;
  isCancelled : () => boolean;
}

interface ReadPdfParams {
  path        : string;
  onPage      : (page: number, total: number) => void;
  isCancelled : () => boolean;
}

// Pages that already have text are read as they are; only the scanned ones are rendered (as in
// "A imágenes") and go through the OCR of Windows.
const readPdf = async ({ path, onPage, isCancelled }: ReadPdfParams): Promise<FileText['pages']> => {
  const document = await loadPdf(path);
  const pages: FileText['pages'] = [];

  for (let page = 1; page <= document.numPages; page += 1) {
    if (isCancelled()) break;
    onPage(page, document.numPages);

    const content    = await (await document.getPage(page)).getTextContent();
    const selectable = textFromItems(content.items);
    if (hasSelectableText(selectable)) {
      pages.push({ page, text: selectable });
      continue;
    }

    const canvas = await renderPage({ document, page, scale: PAGE_RENDER_SCALE });
    const bytes  = await canvasToBytes({ canvas, mime: 'image/png', quality: 1 });
    canvas.width = 0;
    pages.push({ page, text: await readPageText(bytes) });
  }

  return pages;
};

// "Sacar texto": every image and PDF page in order, with progress and Cancelar between pages. What was
// read before a cancel is kept and shown.
export const extractText = async ({ files, destination, onProgress, isCancelled }: ExtractTextParams): Promise<ActionResult> => {
  const read: FileText[] = [];
  const paths: string[]  = [];
  const total            = files.reduce((sum, file) => sum + (file.kind === 'pdf' ? file.pages ?? 1 : 1), 0);
  let done               = 0;

  const step = (name: string) => {
    onProgress({ current: done, total: Math.max(total, 1), name, active: 1, detail: name });
    done += 1;
  };

  for (const [index, file] of files.entries()) {
    if (isCancelled()) break;

    if (file.kind === 'pdf') {
      const pages = await readPdf({ path: file.path, onPage: (page, count) => step(`${file.name} · ${TEXT_TEXTS.page(page, count)}`), isCancelled });
      read.push({ name: file.name, pages });
      paths.push(file.path);
      continue;
    }

    step(files.length > 1 ? `${file.name} · ${TEXT_TEXTS.image(index + 1, files.length)}` : file.name);
    read.push({ name: file.name, pages: [{ page: null, text: await readImageText(file.path) }] });
    paths.push(file.path);
  }

  onProgress({ current: total, total: Math.max(total, 1), name: '', active: 1 });

  const report = await finishText({ paths, files: read });
  return toTextResult({ report, paths, destination, cancelled: isCancelled() });
};
