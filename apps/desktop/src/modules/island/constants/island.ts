import type { IslandColors, IslandSize, MascotPose } from '@/modules/island/interfaces/islandLayout';
import type { VisibleIslandState } from '@/modules/island/types/islandState';

export const PANEL_RADIUS = 26;

export const PANEL_BORDER = 1;

// expanded must match the window size in tauri.conf.json: the window keeps it and only its visible area changes.
export const ISLAND_SIZES: Record<VisibleIslandState, IslandSize> = {
  collapsed : { width: 148, height: 32, radius: 14 },
  expanded  : { width: 1040, height: 640, radius: PANEL_RADIUS },
};

export const MASCOT_SLOT_WIDTH = 120;

// Glup about 76 px wide, centered, showing from the headband down to below the ear cups (eyes and headphones whole).
export const PEEK_POSE: MascotPose = { x: 22, y: -15, scale: 0.633 };

export const ISLAND_COLORS: Record<VisibleIslandState, IslandColors> = {
  collapsed : { background: 'surface', border: 'transparent' },
  expanded  : { background: 'bg', border: 'line' },
};

// The lilac dot of a pending file selection, inside the right end of the pill (px).
export const PILL_DOT = { size: 6, inset: 14 };

// How often the machine is compared with the real window (ms).
export const ISLAND_WATCHDOG_INTERVAL = 2000;

export const ISLAND_TIMING = {
  dwell            : 120,
  dragDwell        : 0,
  leaveDelay       : 350,
  // Reopening after this long goes to Inicio instead of the last section (ms).
  lastPageLifetime : 10 * 60 * 1000,
};
