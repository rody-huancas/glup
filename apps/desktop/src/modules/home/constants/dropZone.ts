// The mint strip of Inicio, low so the summary fits under it; with files chosen (or a task) it shrinks to
// a one-line bar, so the task and its options get the room.
export const DROP_ZONE_SIZES = {
  height         : 88,
  compactHeight  : 60,
  mascot         : 60,
  compactMascot  : 36,
  padding        : 12,
  compactPadding : 10,
  // Room at its sides.
  side           : 22,
  compactSide    : 16,
  // Space between Glup and the text.
  gap            : 18,
  compactGap     : 12,
};

// Seconds, as GSAP expects.
export const DROP_ZONE_MOTION = {
  duration : 0.3,
  ease     : 'power3.out',
};
