import { useCallback, useEffect, useState } from 'react';
import type { ShortcutView } from '@/modules/shortcuts/interfaces/shortcutView';
import { getShortcut } from '@/modules/shortcuts/services/shortcuts';
import type { ShortcutTarget } from '@/modules/shortcuts/types/shortcutTarget';
import { SETTINGS_CHANGED_EVENT } from '@/shared/constants/events';
import { useTauriEvent } from '@/shared/hooks/useTauriEvent';

// A shortcut as it is now; again whenever settings.json changes (a new one saves it there).
export const useShortcutView = (target: ShortcutTarget) => {
  const [view, setView]     = useState<ShortcutView | null>(null);
  const [failed, setFailed] = useState(false);

  const reload = useCallback(() => {
    void getShortcut(target)
      .then((next) => {
        setView(next);
        setFailed(false);
      })
      .catch(() => setFailed(true));
  }, [target]);

  useEffect(reload, [reload]);
  useTauriEvent<null>(SETTINGS_CHANGED_EVENT, reload);

  return { view, setView, failed };
};
