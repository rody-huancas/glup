import { useCallback, useEffect, useRef, useState } from 'react';
import { COPIED_NOTICE_TIME } from '@/modules/history/constants/history';
import type { CopyState } from '@/modules/history/types/copyState';
import { copyScreenText } from '@/modules/screen-text/services/screenText';

// "Copiar de nuevo": the text back to the clipboard and "Copiado" for a moment.
export const useCopyAgain = (text: string) => {
  const [state, setState] = useState<CopyState>('idle');
  const timer             = useRef(0);

  const copy = useCallback(() => {
    void copyScreenText(text)
      .then(() => setState('copied'))
      .catch(() => setState('failed'))
      .finally(() => {
        window.clearTimeout(timer.current);
        timer.current = window.setTimeout(() => setState('idle'), COPIED_NOTICE_TIME);
      });
  }, [text]);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  return { state, copy };
};
