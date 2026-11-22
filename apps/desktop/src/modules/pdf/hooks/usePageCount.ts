import { useEffect, useState } from 'react';
import { loadPdf } from '@/modules/pdf/services/pdfDocument';

// Page count from the file info when known, otherwise from pdf.js.
export const usePageCount = (path: string, known: number | null): number => {
  const [count, setCount] = useState(known ?? 0);

  useEffect(() => {
    if (known) return;

    let active = true;
    void loadPdf(path).then((document) => active && setCount(document.numPages)).catch(() => undefined);

    return () => {
      active = false;
    };
  }, [path, known]);

  return known ?? count;
};
