import type { IslandColors, IslandSize, MascotPose } from '@/modules/island/interfaces/islandLayout';
// import type { IslandTransition } from '@/modules/island/interfaces/islandTransition';
import type { VisibleIslandState } from '@/modules/island/types/islandState';

// Stage 2 panels (340x200 drop zone and 420 px actions) live in legacy/island.
// export const ISLAND_BACKGROUND = '#1E1D22';

export const PANEL_RADIUS = 26;

export const PANEL_BORDER = 1;

// expanded must match the window size in tauri.conf.json: the window keeps it and only its visible area changes.
export const ISLAND_SIZES: Record<VisibleIslandState, IslandSize> = {
  collapsed : { width: 148, height: 32, radius: 14 },
  // collapsed : { width: 120, height: 24, radius: 12 },
  expanded  : { width: 1040, height: 640, radius: PANEL_RADIUS },
  // expanded  : { width: 920, height: 560, radius: PANEL_RADIUS },
  // expanded  : { width: 760, height: 480, radius: PANEL_RADIUS },
  // expanded  : { width: 340, height: 200, radius: PANEL_RADIUS },
};

export const MASCOT_SLOT_WIDTH = 120;

// Glup about 76 px wide, centered, showing from the headband down to below the ear cups (eyes and headphones whole).
export const PEEK_POSE: MascotPose = { x: 22, y: -15, scale: 0.633 };
// export const PEEK_POSE: MascotPose = { x: 28, y: -11, scale: 0.533 };

export const ISLAND_COLORS: Record<VisibleIslandState, IslandColors> = {
  collapsed : { background: 'surface', border: 'transparent' },
  expanded  : { background: 'bg', border: 'line' },
};

export const ISLAND_TIMING = {
  dwell      : 120,
  dragDwell  : 0,
  leaveDelay : 350,
  // dwell      : 200,
  // leaveDelay : 600,
  // dwell             : 150,
  // leaveDelay        : 400,
  // actionsLeaveDelay : 1500,
};

// Replaced by the GSAP timelines in constants/islandTimeline.ts.
// const EXPAND_EASING     = 'cubic-bezier(.2,.9,.3,1.1)';
// const EXPAND_DURATION   = 240;
// const COLLAPSE_DURATION = 160;
// // const EXPAND_EASING = 'cubic-bezier(.3,1.3,.5,1)';
//
// // The content starts fading in when the panel animation reaches this progress.
// const CONTENT_FADE_START = 0.6;
//
// export const ISLAND_TRANSITIONS: Record<VisibleIslandState, IslandTransition> = {
//   expanded: {
//     panel   : { duration: EXPAND_DURATION, easing: EXPAND_EASING },
//     peek    : { duration: 80, easing: 'ease-out' },
//     content : { duration: 120, delay: EXPAND_DURATION * CONTENT_FADE_START, easing: 'ease-out' },
//   },
//   collapsed: {
//     panel   : { duration: COLLAPSE_DURATION, easing: 'ease-in' },
//     peek    : { duration: 80, delay: COLLAPSE_DURATION - 60, easing: 'ease-out' },
//     content : { duration: 80, easing: 'ease-in' },
//   },
//   // expanded: {
//   //   panel   : { duration: 340, easing: 'cubic-bezier(.3,1.3,.5,1)' },
//   //   peek    : { duration: 100, easing: 'ease-out' },
//   //   content : { duration: 150, delay: 300, easing: 'ease-out' },
//   // },
//   // collapsed: {
//   //   panel   : { duration: 220, delay: 60, easing: 'ease-in' },
//   //   peek    : { duration: 150, delay: 180, easing: 'ease-out' },
//   //   content : { duration: 100, easing: 'ease-in' },
//   // },
// };
