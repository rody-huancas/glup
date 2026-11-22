import { invoke } from '@tauri-apps/api/core';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { THUMBNAIL_HEIGHTS } from '@/modules/pdf/constants/pdf';
import { renderPage } from '@/modules/pdf/utils/renderPage';
import { READ_FILE_BYTES } from '@/shared/constants/events';

// The worker ships with the app (bundled by Vite), so pdf.js works without internet.
GlobalWorkerOptions.workerSrc = workerUrl;

const documents  = new Map<string, Promise<PDFDocumentProxy>>();
const thumbnails = new Map<string, Promise<string>>();

export const readFileBytes = async (path: string): Promise<Uint8Array> =>
  new Uint8Array(await invoke<ArrayBuffer>(READ_FILE_BYTES, { path }));

// One pdf.js document per file, shared by thumbnails and page export.
export const loadPdf = (path: string): Promise<PDFDocumentProxy> => {
  const cached = documents.get(path);
  if (cached) return cached;

  const loading = readFileBytes(path).then((data) => getDocument({ data }).promise);
  loading.catch(() => documents.delete(path));
  documents.set(path, loading);
  return loading;
};

interface ThumbnailParams {
  path   : string;
  page   : number;
  height : number;
}

const canvasUrl = (canvas: HTMLCanvasElement): Promise<string> =>
  new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(URL.createObjectURL(blob)) : reject(new Error('thumbnail'))), 'image/png');
  });

// Cached per file, page and height; the object URLs live as long as the app.
export const getPdfThumbnail = ({ path, page, height }: ThumbnailParams): Promise<string> => {
  const key    = `${path}#${page}@${height}`;
  const cached = thumbnails.get(key);
  if (cached) return cached;

  const rendering = loadPdf(path)
    .then((document) => renderPage({ document, page, height }))
    .then(canvasUrl);

  rendering.catch(() => thumbnails.delete(key));
  thumbnails.set(key, rendering);
  return rendering;
};

export const getImageThumbnail = (path: string): Promise<string> => {
  const key    = `${path}#image`;
  const cached = thumbnails.get(key);
  if (cached) return cached;

  const reading = readFileBytes(path).then((bytes) => URL.createObjectURL(new Blob([bytes.slice().buffer])));
  reading.catch(() => thumbnails.delete(key));
  thumbnails.set(key, reading);
  return reading;
};

export const DEFAULT_THUMBNAIL_HEIGHT = THUMBNAIL_HEIGHTS.order;
