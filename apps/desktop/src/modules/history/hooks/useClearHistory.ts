import { useCallback, useState } from 'react';
import { clearHistory, removeHistoryEntries } from '@/modules/history/services/history';
import { useIslandHold } from '@/modules/island/hooks/useIslandHold';

interface UseClearHistoryParams {
  // The lines marked; none means "Limpiar historial" (everything).
  selected  : string[];
  onRemoved : () => void;
}

// "Limpiar historial" or "Quitar seleccionados": asks first and only changes Glup's list
// (history.json); the person's files stay where they are.
export const useClearHistory = ({ selected, onRemoved }: UseClearHistoryParams) => {
  const [confirming, setConfirming] = useState(false);
  const [failed, setFailed]         = useState(false);

  // The dialog keeps the island open while it is on screen.
  useIslandHold(confirming);

  const ask    = useCallback(() => {
    setFailed(false);
    setConfirming(true);
  }, []);
  const cancel = useCallback(() => setConfirming(false), []);

  // The list reloads by itself: Rust announces the change (history-changed).
  const confirm = useCallback(() => {
    setConfirming(false);

    const work = selected.length > 0 ? removeHistoryEntries(selected) : clearHistory();
    void work.then(onRemoved).catch(() => setFailed(true));
  }, [selected, onRemoved]);

  return { confirming, failed, ask, cancel, confirm };
};
