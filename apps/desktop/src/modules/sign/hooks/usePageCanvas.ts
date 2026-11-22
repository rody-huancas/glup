import { useEffect, useRef } from 'react';
import { loadPdf } from '@/modules/pdf/services/pdfDocument';
import { renderPage } from '@/modules/pdf/utils/renderPage';

interface UsePageCanvasParams {
  path  : string;
  page  : number;
  // CSS pixels per PDF point.
  scale : number;
}

// The page rendered with pdf.js at the screen's pixel ratio; the previous one stays until the new one is ready.
export const usePageCanvas = ({ path, page, scale }: UsePageCanvasParams) => {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let active = true;

    void loadPdf(path)
      .then((document) => renderPage({ document, page, scale: scale * window.devicePixelRatio }))
      .then((canvas) => {
        if (!active || !containerRef.current) {
          canvas.width = 0;
          return;
        }

        canvas.className = 'block h-full w-full';
        containerRef.current.replaceChildren(canvas);
      })
      .catch(() => undefined);

    return () => {
      active = false;
    };
  }, [path, page, scale]);

  return containerRef;
};
