import type { Insets, IslandSize, MascotPose } from '@/modules/island/interfaces/islandLayout';
import type { IslandTransition } from '@/modules/island/interfaces/islandTransition';
import type { VisibleIslandState } from '@/modules/island/types/islandState';
import type { Face } from '@/modules/mascot/interfaces/face';
import type { MascotStateType } from '@/modules/mascot/types/mascotState';

// export const ISLAND_BACKGROUND = '#1E1D22';
export const ISLAND_BACKGROUND = 'var(--color-surface)';

export const PANEL_RADIUS = 26;

export const ISLAND_SIZES: Record<Exclude<VisibleIslandState, 'actions'>, IslandSize> = {
  collapsed : { width: 120, height: 24, radius: 12 },
  expanded  : { width: 340, height: 200, radius: PANEL_RADIUS },
};

export const MASCOT_SLOT_WIDTH = 120;

export const MASCOT_POSES: Record<Exclude<VisibleIslandState, 'actions'>, MascotPose> = {
  collapsed : { x: 28, y: -11, scale: 0.533 },
  expanded  : { x: 16, y: 45, scale: 1 },
};

export const ACTIONS_LAYOUT = {
  width       : 420,
  padding     : 16,
  contentLeft : 136,
  mascotX     : 20,
  mascotWidth : 104,
};

export const DROP_ZONE_INSETS: Insets = {
  top    : 16,
  right  : 16,
  bottom : 16,
  left   : 152,
};

export const ISLAND_TEXTS = {
  dropHere: 'Suelta un archivo aquí',
};

export const ISLAND_TIMING = {
  dwell             : 150,
  leaveDelay        : 400,
  actionsLeaveDelay : 1500,
  // afterDropDelay : 1200,
};

const EXPAND_EASING = 'cubic-bezier(.3,1.3,.5,1)';
const BOUNCE_EASING = 'cubic-bezier(.3,1.6,.5,1)';

export const ISLAND_TRANSITIONS: Record<VisibleIslandState, IslandTransition> = {
  expanded: {
    panel    : { duration: 320, easing: EXPAND_EASING },
    mascot   : { duration: 460, easing: BOUNCE_EASING },
    dropZone : { duration: 200, delay: 160, easing: 'ease-out' },
    actions  : { duration: 120, easing: 'ease-in' },
  },
  actions: {
    panel    : { duration: 320, easing: EXPAND_EASING },
    mascot   : { duration: 460, easing: BOUNCE_EASING },
    dropZone : { duration: 120, easing: 'ease-in' },
    actions  : { duration: 220, delay: 140, easing: 'ease-out' },
  },
  collapsed: {
    panel    : { duration: 220, easing: 'ease-in' },
    mascot   : { duration: 220, easing: 'ease-in' },
    dropZone : { duration: 120, easing: 'ease-in' },
    actions  : { duration: 120, easing: 'ease-in' },
  },
};

export const ACTIONS_FACE: Partial<Face> = { eyes: 'happy' };

export const COLLAPSE_BLOCKING_STATES: MascotStateType[] = ['eating', 'working'];
