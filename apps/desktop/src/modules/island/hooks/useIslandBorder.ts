import { useCallback, useEffect } from 'react';
import { ISLAND_EDGE_COLORS, ISLAND_EDGE_VARIABLE } from '@/modules/island/constants/border';
import { getSettings } from '@/modules/settings/services/settings';
import { SETTINGS_CHANGED_EVENT } from '@/shared/constants/events';
import { useTauriEvent } from '@/shared/hooks/useTauriEvent';

// The color of the island's edge comes from "Borde de la isla"; the soft one until the settings answer.
export const useIslandBorder = () => {
  const apply = useCallback(() => {
    void getSettings()
      .then((view) => document.documentElement.style.setProperty(ISLAND_EDGE_VARIABLE, ISLAND_EDGE_COLORS[view.islandBorder]))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    document.documentElement.style.setProperty(ISLAND_EDGE_VARIABLE, ISLAND_EDGE_COLORS.soft);
    apply();
  }, [apply]);
  useTauriEvent<null>(SETTINGS_CHANGED_EVENT, apply);
};
