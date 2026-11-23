import { useCallback, useEffect, useState } from 'react';
import { keepPresent, selectionState, toggleAll, toggleId } from '@/shared/utils/checkSelection';

// The checks of a list (Historial, Portapapeles): one per line and "Seleccionar todo". ids must be stable
// (memoized) between renders.
export const useCheckSelection = (ids: string[]) => {
  const [selected, setSelected] = useState<string[]>([]);

  // Lines that left the list (removed, cleared) are no longer marked.
  useEffect(() => {
    setSelected((current) => {
      const kept = keepPresent(current, ids);
      return kept.length === current.length ? current : kept;
    });
  }, [ids]);

  const toggle    = useCallback((id: string) => setSelected((current) => toggleId(current, id)), []);
  const toggleAny = useCallback(() => setSelected((current) => toggleAll(current, ids)), [ids]);
  const clear     = useCallback(() => setSelected([]), []);

  return { selected, state: selectionState(selected, ids), toggle, toggleAll: toggleAny, clear };
};
