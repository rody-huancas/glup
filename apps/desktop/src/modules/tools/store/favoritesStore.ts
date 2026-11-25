import { changeSettings, getSettings } from '@/modules/settings/services/settings';
import { moveFavorite, removeFavorite, toggleFavorite } from '@/modules/tools/utils/favorites';

// One list for every card and the side bar, kept in settings.json. It changes at once on screen and is
// saved right after; if saving fails, it goes back to what is saved.
let favorites: string[] = [];
let loaded              = false;
const listeners         = new Set<() => void>();

const publish = (next: string[]) => {
  favorites = next;
  listeners.forEach((listener) => listener());
};

export const getFavorites = (): string[] => favorites;

export const subscribeFavorites = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const reloadFavorites = (): Promise<void> =>
  getSettings()
    .then((view) => {
      loaded = true;
      publish(view.favoriteTools);
    })
    .catch(() => undefined);

export const ensureFavorites = (): Promise<void> => (loaded ? Promise.resolve() : reloadFavorites());

const save = (next: string[]): Promise<void> => {
  publish(next);
  return changeSettings((view) => ({ ...view, favoriteTools: next }))
    .then(() => undefined)
    .catch(reloadFavorites);
};

export const toggleFavoriteTool = (id: string): Promise<void> => save(toggleFavorite(favorites, id));

export const removeFavoriteTool = (id: string): Promise<void> => save(removeFavorite(favorites, id));

export const moveFavoriteTool = (from: number, to: number): Promise<void> => save(moveFavorite({ favorites, from, to }));
