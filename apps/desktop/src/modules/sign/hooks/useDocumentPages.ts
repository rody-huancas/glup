import { useEffect, useState } from 'react';
import { loadPdf } from '@/modules/pdf/services/pdfDocument';
import type { Size } from '@/modules/sign/interfaces/geometry';

// Every page's size as shown (rotation applied), in PDF points.
export const useDocumentPages = (path: string) => {
  const [sizes, setSizes]   = useState<Size[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;

    const read = async () => {
      const document = await loadPdf(path);
      const list: Size[] = [];

      for (let page = 1; page <= document.numPages; page += 1) {
        const viewport = (await document.getPage(page)).getViewport({ scale: 1 });
        list.push({ width: viewport.width, height: viewport.height });
      }

      if (active) setSizes(list);
    };

    read().catch(() => active && setFailed(true));

    return () => {
      active = false;
    };
  }, [path]);

  return { sizes, failed };
};
