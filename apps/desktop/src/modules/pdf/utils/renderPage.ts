import type { PDFDocumentProxy } from 'pdfjs-dist';

interface RenderPageParams {
  document : PDFDocumentProxy;
  page     : number;
  // Either a fixed scale (page images) or a target height in CSS pixels (thumbnails).
  scale?   : number;
  height?  : number;
}

interface CanvasBytesParams {
  canvas  : HTMLCanvasElement;
  mime    : string;
  quality : number;
}

// Renders one page into an off-screen canvas.
export const renderPage = async ({ document, page, scale, height }: RenderPageParams): Promise<HTMLCanvasElement> => {
  const pdfPage  = await document.getPage(page);
  const base     = pdfPage.getViewport({ scale: 1 });
  const factor   = scale ?? ((height ?? base.height) / base.height) * window.devicePixelRatio;
  const viewport = pdfPage.getViewport({ scale: factor });
  const canvas   = window.document.createElement('canvas');

  canvas.width  = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);

  // White background, as on paper (JPG has no transparency).
  const context = canvas.getContext('2d');
  if (context) {
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
  }

  await pdfPage.render({ canvas, viewport }).promise;
  pdfPage.cleanup();
  return canvas;
};

export const canvasToBytes = ({ canvas, mime, quality }: CanvasBytesParams): Promise<Uint8Array> =>
  new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) return reject(new Error('canvas'));
        void blob.arrayBuffer().then((buffer) => resolve(new Uint8Array(buffer)));
      },
      mime,
      quality,
    );
  });
