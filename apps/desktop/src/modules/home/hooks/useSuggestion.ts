import { useCallback, useEffect, useMemo, useState } from 'react';
import { useCleanup } from '@/modules/cleanup/hooks/useCleanup';
import type { DiskSpace } from '@/modules/cleanup/interfaces/diskSpace';
import type { LooseFiles } from '@/modules/home/interfaces/looseFiles';
import { closeSuggestion, getDownloadsToSort } from '@/modules/home/services/dashboard';
import { pickSuggestion } from '@/modules/home/utils/suggestion';
import { getSettings } from '@/modules/settings/services/settings';
import { SETTINGS_CHANGED_EVENT } from '@/shared/constants/events';
import { useTauriEvent } from '@/shared/hooks/useTauriEvent';

// Glup's suggestion in Inicio, from the disk, the last scan of Limpieza and Descargas; closing it hides it
// until it changes.
export const useSuggestion = (disk: DiskSpace | null) => {
  const cleanup                     = useCleanup();
  const [downloads, setDownloads]   = useState<LooseFiles | null>(null);
  const [dismissed, setDismissed]   = useState<string[] | null>(null);

  const reload = useCallback(() => {
    void getSettings().then((view) => setDismissed(view.dismissedTips)).catch(() => setDismissed([]));
  }, []);

  useEffect(() => {
    let active = true;
    reload();
    void getDownloadsToSort().then((value) => active && setDownloads(value));
    return () => {
      active = false;
    };
  }, [reload]);
  useTauriEvent<null>(SETTINGS_CHANGED_EVENT, reload);

  const found = cleanup.phase === 'ready' ? cleanup.categories.reduce((total, category) => total + category.total, 0) : null;

  const suggestion = useMemo(
    () => (dismissed === null ? null : pickSuggestion({ disk, cleanup: found, downloads, dismissed })),
    [disk, found, downloads, dismissed],
  );

  const close = useCallback(() => {
    if (!suggestion) return;
    setDismissed((current) => [...(current ?? []), suggestion.key]);
    void closeSuggestion(suggestion.key).catch(reload);
  }, [suggestion, reload]);

  return { suggestion, close };
};
