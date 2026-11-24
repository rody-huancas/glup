import { useCallback, useState } from 'react';
import { clearHistory, removeHistoryEntries } from '@/modules/history/services/history';
import type { ClearScope } from '@/modules/history/types/clearScope';
import { useIslandHold } from '@/modules/island/hooks/useIslandHold';

interface UseClearHistoryParams {
  // The lines marked, for "Quitar" in the selection bar.
  selected  : string[];
  onRemoved : () => void;
}

// "Limpiar historial" (everything) or "Quitar" (the lines marked): asks first and only changes Glup's
// list (history.json); the person's files stay where they are.
export const useClearHistory = ({ selected, onRemoved }: UseClearHistoryParams) => {
  const [asking, setAsking] = useState<ClearScope | null>(null);
  const [failed, setFailed] = useState(false);

  // The dialog keeps the island open while it is on screen.
  useIslandHold(asking !== null);

  const ask = useCallback((scope: ClearScope) => {
    setFailed(false);
    setAsking(scope);
  }, []);

  const cancel = useCallback(() => setAsking(null), []);

  // The list reloads by itself: Rust announces the change (history-changed).
  const confirm = useCallback(() => {
    const scope = asking;
    setAsking(null);

    const work = scope === 'selected' ? removeHistoryEntries(selected) : clearHistory();
    void work.then(onRemoved).catch(() => setFailed(true));
  }, [asking, selected, onRemoved]);

  return { asking, failed, ask, cancel, confirm };
};
