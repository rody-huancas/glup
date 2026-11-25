import { useEffect, useMemo, useRef, useState } from 'react';
import { revealFile } from '@/modules/actions/services/files';
import { PREVIEW_DELAY } from '@/modules/qr/constants/texts';
import type { QrContent } from '@/modules/qr/interfaces/qrContent';
import type { QrLogo, QrPreview, QrStyle } from '@/modules/qr/interfaces/qrStyle';
import { copyQr, pickQrLogo, qrPreview, saveQr } from '@/modules/qr/services/qr';
import type { QrFormat, QrKind } from '@/modules/qr/types/qrTypes';
import { emptyContent, isFilled } from '@/modules/qr/utils/qr';
import type { SaveDestination } from '@/modules/settings/interfaces/appSettings';

// "Crear un QR": the form of each kind (kept while switching), its look, the live preview checked by
// Glup's reader (a moment after each change), and saving or copying it.
export const useQrCreator = () => {
  const [kind, setKind]         = useState<QrKind>('text');
  const [forms, setForms]       = useState<Record<QrKind, QrContent>>(() => ({ text: emptyContent('text'), wifi: emptyContent('wifi'), whatsapp: emptyContent('whatsapp'), contact: emptyContent('contact'), email: emptyContent('email') }));
  const [style, setStyle]       = useState<QrStyle>({ dark: '#111111', light: '#FFFFFF', dots: 'square', corners: 'square', margin: 4 });
  const [logo, setLogo]         = useState<QrLogo>({ kind: 'none' });
  const [format, setFormat]     = useState<QrFormat>('png');
  const [size, setSize]         = useState(1024);
  const [preview, setPreview]   = useState<QrPreview | null>(null);
  const [checking, setChecking] = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [saved, setSaved]       = useState<string | null>(null);
  const [copied, setCopied]     = useState(false);
  const turn                    = useRef(0);

  const content = forms[kind];
  const filled  = isFilled(content);
  const request = useMemo(() => ({ content, style, logo }), [content, style, logo]);

  useEffect(() => {
    setSaved(null);
    setCopied(false);
    if (!filled) {
      setPreview(null);
      setError(null);
      return;
    }
    const mine = ++turn.current;
    setChecking(true);
    const timer = window.setTimeout(() => {
      void qrPreview(request)
        .then((next) => {
          if (mine !== turn.current) return;
          setPreview(next);
          setError(null);
        })
        .catch((failure: unknown) => mine === turn.current && setError(String(failure)))
        .finally(() => mine === turn.current && setChecking(false));
    }, PREVIEW_DELAY);
    return () => window.clearTimeout(timer);
  }, [request, filled]);

  const change = (next: Partial<QrContent>) => setForms((current) => ({ ...current, [kind]: { ...current[kind], ...next } as QrContent }));
  const restyle = (next: Partial<QrStyle>) => setStyle((current) => ({ ...current, ...next }));

  const chooseLogo = (choice: QrLogo['kind']) => {
    if (choice !== 'file') return setLogo(choice === 'glup' ? { kind: 'glup' } : { kind: 'none' });
    void pickQrLogo().then((path) => path && setLogo({ kind: 'file', path })).catch(() => undefined);
  };

  const save = (destination: SaveDestination) => {
    void saveQr({ ...request, format, size, destination }).then(setSaved).catch((failure: unknown) => setError(String(failure)));
  };
  const copy = () => {
    void copyQr(request).then(() => setCopied(true)).catch((failure: unknown) => setError(String(failure)));
  };
  const reveal = () => {
    if (saved) void revealFile(saved);
  };

  return { kind, setKind, content, change, style, restyle, logo, chooseLogo, format, setFormat, size, setSize, preview, checking, error, filled, save, copy, saved, copied, reveal };
};
