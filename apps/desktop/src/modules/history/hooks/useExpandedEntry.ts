import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import type { HistoryEntry } from '@/modules/history/interfaces/historyEntry';
import { clearHistoryReveal, getHistoryReveal, subscribeHistoryReveal } from '@/modules/history/store/historyReveal';
import { historyEntryElementId } from '@/modules/history/utils/historyEntry';

interface UseExpandedEntryParams {
  entries : HistoryEntry[];
  // Historial opens the line "Ver" asked for; Inicio's short list does not.
  reveal  : boolean;
}

// The copied text open on its line (one at a time).
export const useExpandedEntry = ({ entries, reveal }: UseExpandedEntryParams) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const revealed                    = useSyncExternalStore(subscribeHistoryReveal, getHistoryReveal);

  // Once the line is in the list: open, in view, and the request is done.
  useEffect(() => {
    if (!reveal || !revealed || !entries.some((entry) => entry.id === revealed)) return;

    setExpandedId(revealed);
    clearHistoryReveal();
    window.requestAnimationFrame(() => document.getElementById(historyEntryElementId(revealed))?.scrollIntoView({ block: 'nearest' }));
  }, [reveal, revealed, entries]);

  const toggle = useCallback((id: string) => setExpandedId((current) => (current === id ? null : id)), []);

  return { expandedId, toggle };
};
