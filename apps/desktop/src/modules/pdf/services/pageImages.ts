import { invoke } from '@tauri-apps/api/core';
import type { ActionProgress, ActionReport } from '@/modules/actions/interfaces/actionReport';
import { PAGE_IMAGE_OPTIONS } from '@/modules/pdf/constants/imageFormats';
import { JPEG_QUALITY, PAGE_IMAGE_HEADERS, PAGE_RENDER_SCALE, PDF_TEXTS } from '@/modules/pdf/constants/pdf';
import { loadPdf } from '@/modules/pdf/services/pdfDocument';
import type { PageImageFormat } from '@/modules/pdf/types/pageImageFormat';
import { canvasToBytes, renderPage } from '@/modules/pdf/utils/renderPage';
import type { SaveDestination } from '@/modules/settings/interfaces/appSettings';
import { BEGIN_PAGE_IMAGES, FINISH_PAGE_IMAGES, SAVE_PAGE_IMAGE } from '@/shared/constants/events';

export interface ExportPagesParams {
  path        : string;
  format      : PageImageFormat;
  destination : SaveDestination;
  bundle      : boolean;
  onProgress  : (progress: ActionProgress) => void;
  isCancelled : () => boolean;
  taskId      : string;
}

// "A imágenes": pdf.js renders each page here and Rust writes the bytes (raw, without JSON) to disk.
// The session is always closed, so a failure or a cancel still delivers the pages already written.
export const exportPdfPages = async ({ path, format, destination, bundle, onProgress, isCancelled, taskId }: ExportPagesParams): Promise<ActionReport> => {
  const document = await loadPdf(path);
  const total    = document.numPages;
  const mime     = PAGE_IMAGE_OPTIONS.find((option) => option.format === format)?.mime ?? 'image/jpeg';
  const session  = await invoke<number>(BEGIN_PAGE_IMAGES, { request: { path, format, total, destination, bundle, taskId } });
  let cancelled  = false;

  try {
    for (let page = 1; page <= total; page += 1) {
      if (isCancelled()) {
        cancelled = true;
        break;
      }

      onProgress({ current: page - 1, total, name: PDF_TEXTS.pageProgress(page, total), active: 1 });

      const canvas = await renderPage({ document, page, scale: PAGE_RENDER_SCALE });
      const bytes  = await canvasToBytes({ canvas, mime, quality: JPEG_QUALITY });
      const headers = { [PAGE_IMAGE_HEADERS.session]: String(session), [PAGE_IMAGE_HEADERS.page]: String(page) };

      await invoke(SAVE_PAGE_IMAGE, bytes, { headers });
      canvas.width = 0;
    }
  } finally {
    onProgress({ current: total, total, name: '', active: 1 });
  }

  return invoke<ActionReport>(FINISH_PAGE_IMAGES, { request: { session, cancelled, taskId } });
};
