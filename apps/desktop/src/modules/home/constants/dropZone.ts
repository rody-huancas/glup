// The mint card of Inicio, with a big Glup next to «Esta semana hicimos»; with files chosen (or a task)
// it shrinks to a one-line bar, so the task and its options get the room.
export const DROP_ZONE_SIZES = {
  height         : 152,
  compactHeight  : 60,
  mascot         : 104,
  compactMascot  : 36,
  padding        : 16,
  compactPadding : 10,
  // Room at its sides.
  side           : 22,
  compactSide    : 16,
  // Space between Glup and the text.
  gap            : 20,
  compactGap     : 12,
};

// Seconds, as GSAP expects.
export const DROP_ZONE_MOTION = {
  duration : 0.3,
  ease     : 'power3.out',
};
