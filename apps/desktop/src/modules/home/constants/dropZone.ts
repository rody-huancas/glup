// The drop zone fills the free height; with the actions panel it shrinks to a compact row.
export const DROP_ZONE_SIZES = {
  minHeight      : 200,
  compactHeight  : 120,
  mascot         : 120,
  compactMascot  : 64,
  padding        : 32,
  compactPadding : 12,
  // Space between the title and the hint; it collapses with the hint in the compact layout.
  hintGap        : 8,
};

// export const DROP_ZONE_SIZES = {
//   minHeight     : 180,
//   mascot        : 150,
//   compactMascot : 68,
//   hintGap       : 12,
// };

// Seconds, as GSAP expects.
export const DROP_ZONE_MOTION = {
  duration : 0.3,
  ease     : 'power3.out',
};
