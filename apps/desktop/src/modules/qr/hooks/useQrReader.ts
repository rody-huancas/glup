import { useCallback, useEffect, useState } from 'react';
import { getFileName } from '@/modules/actions/utils/paths';
import { loadPdf } from '@/modules/pdf/services/pdfDocument';
import { canvasToBytes, renderPage } from '@/modules/pdf/utils/renderPage';
import { QR_READ_TEXTS } from '@/modules/qr/constants/texts';
import type { CodeSource, ReadCode } from '@/modules/qr/interfaces/readCode';
import { readQrBytes, readQrClipboard, readQrFiles, startScreenQr } from '@/modules/qr/services/qr';
import { subscribeQrInbox, takeQrInbox } from '@/modules/qr/store/qrInbox';

// A PDF page drawn big enough for a small code.
const PDF_SCALE = 2;
let counter     = 0;
const newId     = () => `qr-${Date.now().toString(36)}-${(counter += 1)}`;

// "Leer un QR": the places it reads (files, every page of a PDF, a zone of the screen, the clipboard),
// newest first, and what came from elsewhere (the right click, the screen) through its inbox.
export const useQrReader = () => {
  const [sources, setSources] = useState<CodeSource[]>([]);
  const [reading, setReading] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  const add = useCallback((found: CodeSource[]) => setSources((current) => [...found, ...current]), []);

  const readPdf = async (path: string): Promise<CodeSource[]> => {
    const document = await loadPdf(path);
    const found: CodeSource[] = [];
    for (let page = 1; page <= document.numPages; page += 1) {
      const canvas = await renderPage({ document, page, scale: PDF_SCALE });
      const bytes  = await canvasToBytes({ canvas, mime: 'image/png', quality: 1 });
      canvas.width = 0;
      const codes  = await readQrBytes(bytes).catch((): ReadCode[] => []);
      if (codes.length > 0 || document.numPages === 1) found.push({ id: newId(), label: QR_READ_TEXTS.page(getFileName(path), page), codes, error: null });
    }
    return found.length > 0 ? found : [{ id: newId(), label: getFileName(path), codes: [], error: null }];
  };

  const readPaths = useCallback(async (paths: string[]) => {
    setReading(true);
    setProblem(null);
    try {
      const pdfs   = paths.filter((path) => path.toLowerCase().endsWith('.pdf'));
      const images = paths.filter((path) => !pdfs.includes(path));
      const read   = images.length > 0 ? await readQrFiles(images) : [];
      const found  = read.map((file): CodeSource => ({ id: newId(), label: file.name, codes: file.codes, error: file.error }));
      for (const pdf of pdfs) found.push(...(await readPdf(pdf).catch((): CodeSource[] => [{ id: newId(), label: getFileName(pdf), codes: [], error: QR_READ_TEXTS.none }])));
      add(found);
    } finally {
      setReading(false);
    }
  }, [add]);

  const takeInbox = useCallback(() => {
    const inbox = takeQrInbox();
    if (inbox?.codes) add([{ id: newId(), label: QR_READ_TEXTS.fromScreen, codes: inbox.codes, error: null }]);
    if (inbox?.paths) void readPaths(inbox.paths);
  }, [add, readPaths]);

  useEffect(() => {
    takeInbox();
    return subscribeQrInbox(takeInbox);
  }, [takeInbox]);

  const fromClipboard = () => {
    setProblem(null);
    void readQrClipboard()
      .then((codes) => add([{ id: newId(), label: QR_READ_TEXTS.fromClip, codes, error: null }]))
      .catch((failure: unknown) => setProblem(String(failure)));
  };

  return { sources, reading, problem, readPaths, fromScreen: () => void startScreenQr(), fromClipboard, clear: () => setSources([]) };
};
