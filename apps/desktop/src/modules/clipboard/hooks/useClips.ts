import { useCallback, useEffect, useState } from 'react';
import { SEARCH_DELAY } from '@/modules/clipboard/constants/clipboard';
import type { Clip } from '@/modules/clipboard/interfaces/clip';
import { listClips } from '@/modules/clipboard/services/clipboard';
import { CLIPBOARD_CHANGED_EVENT } from '@/shared/constants/events';
import { useTauriEvent } from '@/shared/hooks/useTauriEvent';

// The list as the search finds it (Rust looks in the whole texts), again on every new copy.
export const useClips = (enabled: boolean) => {
  const [query, setQuery]   = useState('');
  const [clips, setClips]   = useState<Clip[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [now, setNow]       = useState(() => new Date());

  const load = useCallback((search: string) => {
    void listClips(search)
      .then((next) => {
        setClips(next);
        setFailed(false);
        setNow(new Date());
      })
      .catch(() => setFailed(true));
  }, []);

  // While typing, it waits a moment after the last key.
  useEffect(() => {
    if (!enabled) return;

    const timer = window.setTimeout(() => load(query), query ? SEARCH_DELAY : 0);
    return () => window.clearTimeout(timer);
  }, [enabled, query, load]);

  useTauriEvent<null>(CLIPBOARD_CHANGED_EVENT, () => {
    if (enabled) load(query);
  });

  return { query, setQuery, clips, failed, now };
};
