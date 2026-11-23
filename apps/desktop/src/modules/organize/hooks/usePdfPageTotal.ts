import { useEffect, useState } from 'react';
import { loadPdf } from '@/modules/pdf/services/pdfDocument';

// How many pages the PDF has (null while pdf.js opens it), or failed if it cannot be read.
export const usePdfPageTotal = (path: string) => {
  const [total, setTotal]   = useState<number | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;

    void loadPdf(path)
      .then((document) => active && setTotal(document.numPages))
      .catch(() => active && setFailed(true));

    return () => {
      active = false;
    };
  }, [path]);

  return { total, failed };
};
