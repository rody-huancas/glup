import { useEffect, useSyncExternalStore } from 'react';
import { ensureFavorites, getFavorites, reloadFavorites, subscribeFavorites } from '@/modules/tools/store/favoritesStore';
import { SETTINGS_CHANGED_EVENT } from '@/shared/constants/events';
import { useTauriEvent } from '@/shared/hooks/useTauriEvent';

export const useFavorites = (): string[] => {
  const favorites = useSyncExternalStore(subscribeFavorites, getFavorites);

  useEffect(() => {
    void ensureFavorites();
  }, []);
  useTauriEvent<null>(SETTINGS_CHANGED_EVENT, () => void reloadFavorites());

  return favorites;
};
