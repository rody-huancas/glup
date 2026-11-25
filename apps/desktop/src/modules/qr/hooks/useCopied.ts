import { useCallback, useEffect, useRef, useState } from 'react';
import { copyScreenText } from '@/modules/screen-text/services/screenText';

const SHOWN_FOR = 1800;

// «Copiar» that says «Copiado» for a moment (the same clipboard writer as Copiar texto de la pantalla).
export const useCopied = () => {
  const [copied, setCopied] = useState<string | null>(null);
  const timer               = useRef<number | null>(null);

  useEffect(() => () => {
    if (timer.current) window.clearTimeout(timer.current);
  }, []);

  const copy = useCallback((key: string, text: string) => {
    void copyScreenText(text).then(() => {
      setCopied(key);
      if (timer.current) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setCopied(null), SHOWN_FOR);
    }).catch(() => undefined);
  }, []);

  return { copied, copy };
};
