import type { Insets, IslandSize, MascotPose } from '@/modules/island/interfaces/islandLayout';
import type { IslandTransition } from '@/modules/island/interfaces/islandTransition';
import type { VisibleIslandState } from '@/modules/island/types/islandState';
import type { MascotStateType } from '@/modules/mascot/types/mascotState';

export const ISLAND_BACKGROUND = '#1E1D22';

export const ISLAND_SIZES: Record<VisibleIslandState, IslandSize> = {
  collapsed : { width: 120, height: 24, radius: 12 },
  expanded  : { width: 340, height: 200, radius: 24 },
};

export const MASCOT_SLOT_WIDTH = 120;

export const MASCOT_POSES: Record<VisibleIslandState, MascotPose> = {
  collapsed : { x: 28, y: -11, scale: 0.533 },
  expanded  : { x: 16, y: 45, scale: 1 },
};

export const DROP_ZONE_INSETS: Insets = {
  top    : 16,
  right  : 16,
  bottom : 16,
  left   : 152,
};

export const ISLAND_TIMING = {
  dwell          : 150,
  leaveDelay     : 400,
  afterDropDelay : 1200,
};

export const ISLAND_TRANSITIONS: Record<VisibleIslandState, IslandTransition> = {
  expanded: {
    panel    : { duration: 320, easing: 'cubic-bezier(.3,1.3,.5,1)' },
    mascot   : { duration: 460, easing: 'cubic-bezier(.3,1.6,.5,1)' },
    dropZone : { duration: 200, delay: 160, easing: 'ease-out' },
  },
  collapsed: {
    panel    : { duration: 220, easing: 'ease-in' },
    mascot   : { duration: 220, easing: 'ease-in' },
    dropZone : { duration: 120, easing: 'ease-in' },
  },
};

export const COLLAPSE_BLOCKING_STATES: MascotStateType[] = ['eating', 'working'];
