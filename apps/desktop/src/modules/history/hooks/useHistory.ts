import { useEffect, useMemo, useState } from 'react';
import type { HistoryEntry } from '@/modules/history/interfaces/historyEntry';
import { fetchHistory } from '@/modules/history/services/history';

export const useHistory = (limit?: number) => {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const now                   = useMemo(() => new Date(), []);

  useEffect(() => {
    let active = true;

    void fetchHistory().then((result) => {
      if (active) setEntries(result);
    });

    return () => {
      active = false;
    };
  }, []);

  const visible = useMemo(() => (limit ? entries.slice(0, limit) : entries), [entries, limit]);

  return { entries: visible, now };
};
