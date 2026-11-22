import { useCallback, useEffect, useMemo, useState } from 'react';
import { CREATE_TEXTS, CROP_PADDING, INK_COLORS } from '@/modules/sign/constants/sign';
import type { PixelImage } from '@/modules/sign/interfaces/pixelImage';
import type { InkColor } from '@/modules/sign/types/inkColor';
import { extractSignature, hexToRgb, prepareUpload } from '@/modules/sign/utils/ink';
import { fileToPixels, pixelsToUrl } from '@/modules/sign/utils/signatureImage';

// "Subir foto": the image without its paper (or as is when already transparent), trimmed, in its own
// color or the chosen ink, with a preview.
export const useInkUpload = (color: InkColor) => {
  const [source, setSource]         = useState<PixelImage | null>(null);
  const [preview, setPreview]       = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError]           = useState<string | null>(null);

  // The cut-out is computed once per photo; changing the color only recolors it.
  const cutOut = useMemo(() => (source ? extractSignature(source) : null), [source]);

  const result = useMemo(
    () => (cutOut ? prepareUpload({ image: cutOut, color: color === 'original' ? null : hexToRgb(INK_COLORS[color]), padding: CROP_PADDING }) : null),
    [cutOut, color],
  );
  // const result = useMemo(
  //   () => (source ? cropToContent({ image: extractInk({ image: source, color: hexToRgb(INK_COLORS[color]) }), padding: CROP_PADDING }) : null),
  //   [source, color],
  // );

  useEffect(() => {
    if (!result) {
      setPreview(null);
      return;
    }

    let active = true;
    let url    = '';

    void pixelsToUrl(result).then((value) => {
      url = value;
      if (active) setPreview(value);
      else URL.revokeObjectURL(value);
    });

    return () => {
      active = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [result]);

  useEffect(() => {
    if (source && !result) setError(CREATE_TEXTS.empty);
  }, [source, result]);

  const pick = useCallback((file: File) => {
    setProcessing(true);
    setError(null);

    void fileToPixels(file)
      .then((pixels) => {
        setSource(pixels);
        if (!pixels) setError(CREATE_TEXTS.unreadable);
      })
      .catch(() => setError(CREATE_TEXTS.unreadable))
      .finally(() => setProcessing(false));
  }, []);

  return { result, preview, processing, error, pick };
};
