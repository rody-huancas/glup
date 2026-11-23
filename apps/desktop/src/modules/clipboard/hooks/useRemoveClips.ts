import { useCallback, useState } from 'react';
import { removeClips } from '@/modules/clipboard/services/clipboard';
import { useIslandHold } from '@/modules/island/hooks/useIslandHold';

// "Quitar" (one line) or "Quitar seleccionados": asks first, as Historial does.
export const useRemoveClips = (onRemoved: () => void) => {
  const [pending, setPending] = useState<string[] | null>(null);
  const [failed, setFailed]   = useState(false);

  // The dialog keeps the island open while it is on screen.
  useIslandHold(pending !== null);

  const ask = useCallback((ids: string[]) => {
    setFailed(false);
    if (ids.length > 0) setPending(ids);
  }, []);

  const cancel = useCallback(() => setPending(null), []);

  const confirm = useCallback(() => {
    if (!pending) return;

    setPending(null);
    void removeClips(pending).then(onRemoved).catch(() => setFailed(true));
  }, [pending, onRemoved]);

  return { pending, failed, ask, cancel, confirm };
};
