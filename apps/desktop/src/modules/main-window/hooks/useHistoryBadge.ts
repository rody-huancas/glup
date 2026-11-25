import { useCallback, useEffect, useState } from 'react';
import { useHistory } from '@/modules/history/hooks/useHistory';
import { markHistorySeen } from '@/modules/main-window/services/history';
import { countNewEntries } from '@/modules/main-window/utils/historyCount';
import { getSettings } from '@/modules/settings/services/settings';
import { SETTINGS_CHANGED_EVENT } from '@/shared/constants/events';
import { useTauriEvent } from '@/shared/hooks/useTauriEvent';

// How many entries came since the Historial was last opened. The first time (no date saved yet) the
// count starts now, so it never begins with everything there was.
export const useHistoryBadge = (): number => {
  const { entries }         = useHistory();
  const [seenAt, setSeenAt] = useState<number | null>(null);

  const reload = useCallback(() => {
    void getSettings()
      .then((view) => {
        if (view.historySeenAt === null) return void markHistorySeen();
        setSeenAt(view.historySeenAt);
      })
      .catch(() => undefined);
  }, []);

  useEffect(reload, [reload]);
  useTauriEvent<null>(SETTINGS_CHANGED_EVENT, reload);

  return countNewEntries(entries, seenAt);
};
