import { useState } from 'react';
import { SIGNATURE_FONTS } from '@/modules/sign/constants/fonts';
import { CREATE_TEXTS, INK_COLORS, MAX_SIGNATURES } from '@/modules/sign/constants/sign';
import { useDrawing } from '@/modules/sign/hooks/useDrawing';
import { useInkUpload } from '@/modules/sign/hooks/useInkUpload';
import type { PixelImage } from '@/modules/sign/interfaces/pixelImage';
import type { SaveSignatureParams } from '@/modules/sign/interfaces/signPdf';
import type { CreateTab } from '@/modules/sign/types/createTab';
import type { InkColor, SolidInk } from '@/modules/sign/types/inkColor';
import { pixelsToPng, strokesToImage, typedToImage } from '@/modules/sign/utils/signatureImage';

interface UseCreateSignatureParams {
  savedCount : number;
  onAccept   : (params: SaveSignatureParams) => Promise<void>;
}

// The "Crear firma" dialog: three ways to make one, ink color, whether to keep it, and the PNG at the end.
export const useCreateSignature = ({ savedCount, onAccept }: UseCreateSignatureParams) => {
  const full                  = savedCount >= MAX_SIGNATURES;
  const [tab, setTab]         = useState<CreateTab>('draw');
  const [color, setColor]     = useState<SolidInk>('black');
  // Uploads start with the stroke's own color.
  const [uploadInk, setUploadInk] = useState<InkColor>('original');
  const [keep, setKeep]       = useState(!full);
  const [name, setName]       = useState('');
  const [font, setFont]       = useState<string>(SIGNATURE_FONTS[0]);
  const [busy, setBusy]       = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const drawing               = useDrawing(INK_COLORS[color]);
  const upload                = useInkUpload(uploadInk);

  const ready = (tab === 'draw' && !drawing.empty) || (tab === 'type' && name.trim() !== '') || (tab === 'upload' && upload.result !== null);

  const image = async (): Promise<PixelImage | null> => {
    if (tab === 'draw') return strokesToImage({ strokes: drawing.strokes, color: INK_COLORS[color] });
    if (tab === 'type') return typedToImage({ text: name.trim(), family: font, color: INK_COLORS[color] });
    return upload.result;
  };

  const accept = async () => {
    if (!ready || busy) return;

    setBusy(true);
    setError(null);

    try {
      const pixels = await image();
      if (!pixels) throw new Error('empty');

      await onAccept({ bytes: await pixelsToPng(pixels), keep: keep && !full });
    } catch (failure) {
      setError(typeof failure === 'string' ? failure : CREATE_TEXTS.failed);
      setBusy(false);
    }
  };

  return {
    tab,
    setTab,
    color,
    setColor,
    uploadInk,
    setUploadInk,
    keep : keep && !full,
    full,
    setKeep,
    name,
    setName,
    font,
    setFont,
    drawing,
    upload,
    ready,
    busy,
    error,
    accept,
  };
};
