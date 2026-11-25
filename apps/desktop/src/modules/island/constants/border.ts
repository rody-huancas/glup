import type { IslandBorder } from '@/modules/island/types/islandBorder';

// The variable the island's outline is drawn with (IslandSilhouette), set on the page by useIslandBorder.
export const ISLAND_EDGE_VARIABLE = '--island-edge';

export const ISLAND_EDGE_COLORS: Record<IslandBorder, string> = {
  soft   : 'var(--color-island-edge-soft)',
  strong : 'var(--color-island-edge-strong)',
  none   : 'transparent',
};

export const ISLAND_BORDERS: IslandBorder[] = ['soft', 'strong', 'none'];

export const BORDER_TEXTS = {
  section : 'Apariencia',
  title   : 'Borde de la isla',
  hint    : 'Un filo claro para que Glup no se pierda en fondos oscuros.',
  options : {
    soft   : { label: 'Suave', hint: 'Como el filo de un vidrio' },
    strong : { label: 'Marcado', hint: 'Más visible' },
    none   : { label: 'Sin borde', hint: 'Como antes' },
  } satisfies Record<IslandBorder, { label: string; hint: string }>,
};
