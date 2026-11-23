// The drop zone fills the free height; with files chosen (or a task) it shrinks to a one-line bar, so
// the task and its options get the room.
export const DROP_ZONE_SIZES = {
  minHeight      : 200,
  compactHeight  : 60,
  mascot         : 120,
  compactMascot  : 36,
  padding        : 32,
  compactPadding : 10,
  // The bar is wide and short: less room at its sides than the big zone.
  compactSide    : 16,
  // Space between Glup and the text.
  gap            : 28,
  compactGap     : 12,
};

// export const DROP_ZONE_SIZES = {
//   minHeight      : 200,
//   compactHeight  : 120,
//   mascot         : 120,
//   compactMascot  : 64,
//   padding        : 32,
//   compactPadding : 12,
//   hintGap        : 8,
// };

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
