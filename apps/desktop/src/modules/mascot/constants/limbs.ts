import type { LimbName } from '@/modules/mascot/types/limbName';

// Drawn in this order behind the body: feet first, then arms.
export const LIMB_NAMES: LimbName[] = ['foot-left', 'foot-right', 'arm-left', 'arm-right', 'arm-wave'];

// Seconds and degrees. Given the pivots (shoulder side), a positive angle raises the left arm
// and a negative one raises the right arm; the opposite moves the hand inward, behind the body.
export const LIMB_MOTION = {
  breath    : { angle: 2, duration: 1.7, phase: 0.45 },
  tap       : { angle: 6, down: 0.1, up: 0.18, minDelay: 2.5, maxDelay: 5 },
  rub       : { inward: -10, outward: 4, beat: 0.11 },
  eating    : { raise: 38, lift: -6, up: 0.3, hold: 0.62, down: 0.22 },
  working   : { angle: 10, beat: 0.26, footAngle: 5 },
  happy     : { raise: 35, spread: 10, jump: 0.76, apex: 0.45, jumps: 2 },
  confused  : { raise: -75, scratch: 8, up: 0.3, beat: 0.12 },
  wave      : { angle: 12, beat: 0.18, times: 3, swap: 0.08 },
  waveOnce  : { angle: 12, beat: 0.12, times: 1, swap: 0.04 },
  point     : { angle: -42, reach: 0.25, hold: 1, back: 0.3 },
  stretch   : { raise: 65, scaleY: 1.06, up: 0.4, hold: 0.5, down: 0.4 },
  tapDance  : { angle: 7, beat: 0.12, times: 4 },
  reset     : 0.2,
};
