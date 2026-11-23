import { useCallback, useEffect, useRef, useState } from 'react';
import { COPIED_TIME } from '@/modules/clipboard/constants/clipboard';
import type { CopiedLine } from '@/modules/clipboard/interfaces/copiedLine';
import { copyClip } from '@/modules/clipboard/services/clipboard';

// Copies a line again and says so on it ("Copiado") for a moment.
export const useCopyClip = () => {
  const [copied, setCopied] = useState<CopiedLine | null>(null);
  const timer               = useRef(0);

  const copy = useCallback((id: string) => {
    void copyClip(id)
      .then(() => setCopied({ id, state: 'copied' }))
      .catch(() => setCopied({ id, state: 'failed' }))
      .finally(() => {
        window.clearTimeout(timer.current);
        timer.current = window.setTimeout(() => setCopied(null), COPIED_TIME);
      });
  }, []);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  return { copied, copy };
};
