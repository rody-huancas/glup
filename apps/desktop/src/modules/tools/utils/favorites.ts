// The favorite tools: ids of tools.json, in the order the person left them in the side bar.

export const isFavorite = (favorites: string[], id: string): boolean => favorites.includes(id);

// The star: added at the end, or taken out.
export const toggleFavorite = (favorites: string[], id: string): string[] =>
  isFavorite(favorites, id) ? favorites.filter((item) => item !== id) : [...favorites, id];

export const removeFavorite = (favorites: string[], id: string): string[] => favorites.filter((item) => item !== id);

interface MoveParams {
  favorites : string[];
  from      : number;
  to        : number;
}

// Dragged (or moved with the keyboard) from one place to another; out of range stays as it was.
export const moveFavorite = ({ favorites, from, to }: MoveParams): string[] => {
  if (from === to || from < 0 || from >= favorites.length || to < 0 || to >= favorites.length) return favorites;

  const next     = [...favorites];
  const [moved]  = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
};

// Only the ones that still exist (a tool that is gone, or not on this system, drops out of the list).
export const knownFavorites = <T extends { id: string }>(favorites: string[], tools: T[]): T[] =>
  favorites.map((id) => tools.find((tool) => tool.id === id)).filter((tool): tool is T => tool !== undefined);
