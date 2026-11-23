import { useCallback, useEffect, useMemo, useState } from 'react';
import type { HistoryEntry } from '@/modules/history/interfaces/historyEntry';
import { keepPresent, selectionState, toggleAll, toggleId } from '@/modules/history/utils/historySelection';

// The checks of Historial: one per line and "Seleccionar todo".
export const useHistorySelection = (entries: HistoryEntry[]) => {
  const [selected, setSelected] = useState<string[]>([]);
  const ids                     = useMemo(() => entries.map((entry) => entry.id), [entries]);

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
