import type { IslandColors } from '@/modules/island/interfaces/islandColors';
import type { VisibleIslandState } from '@/modules/island/types/islandState';

export const PANEL_BORDER = 1;

// Drawn at twice the width because the silhouette clips its outer half, leaving 1 px.
export const OUTLINE_WIDTH = 2;

// The mint glow of the resting pill under the cursor, faint: its width (the outer half is clipped too),
// its blur, how strong it gets and how long it takes to show or go (none with reduced motion). It never
// stays on the open panel.
export const HOVER_GLOW = { width: 5, blur: 2, opacity: 0.5, duration: 0.2, ease: 'power1.out' };

// The slot Glup is laid out in; each pill and the notice scale it (dock/constants: PILL_POSES).
export const MASCOT_SLOT_WIDTH = 120;

// The thin bar of a running task along the pill (px).
export const PROGRESS_THICKNESS = 3;

// The edge is the same in every state (its color comes from "Borde de la isla").
export const ISLAND_COLORS: Record<VisibleIslandState, IslandColors> = {
  collapsed : { background: 'surface' },
  expanded  : { background: 'bg' },
};


// How often the machine is compared with the real window (ms).
export const ISLAND_WATCHDOG_INTERVAL = 2000;

export const ISLAND_TIMING = {
  dwell            : 120,
  dragDwell        : 0,
  leaveDelay       : 350,
  // The open bubble waits this long after losing the focus before closing (a click outside).
  outsideDelay     : 150,
  // Reopening after this long goes to Inicio instead of the last section (ms).
  lastPageLifetime : 10 * 60 * 1000,
};

// Pressing on the pill and moving this far (px) starts dragging it to another edge.
export const DRAG_THRESHOLD = 5;
