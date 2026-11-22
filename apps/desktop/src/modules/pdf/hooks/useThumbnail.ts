import { useEffect, useState } from 'react';
import type { FileType } from '@/modules/actions/types/fileType';
import { getImageThumbnail, getPdfThumbnail } from '@/modules/pdf/services/pdfDocument';

interface UseThumbnailParams {
  path    : string;
  kind    : FileType;
  page    : number;
  height  : number;
  enabled : boolean;
}

// First page of a PDF (or any page), or the image itself; null while loading or for other files.
export const useThumbnail = ({ path, kind, page, height, enabled }: UseThumbnailParams): string | null => {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || kind === 'other') return;

    let active = true;
    const load = kind === 'pdf' ? getPdfThumbnail({ path, page, height }) : getImageThumbnail(path);

    void load.then((value) => active && setUrl(value)).catch(() => undefined);

    return () => {
      active = false;
    };
  }, [path, kind, page, height, enabled]);

  return url;
};
