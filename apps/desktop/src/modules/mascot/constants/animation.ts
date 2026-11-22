import type { Point } from '@/shared/interfaces/point';

export const BOUNCE_EASING = 'cubic-bezier(.3,1.6,.5,1)';

export const TRANSFORM_ORIGIN = '50% 92%';

export const DRAG_THRESHOLD = 4;

export const BREATH = {
  duration  : 3400,
  keyframes : [
    { transform: 'scale(1, 1)' },
    { transform: 'scale(1.018, 0.976)' },
    { transform: 'scale(1, 1)' },
  ],
};

export const BLINK = {
  duration     : 150,
  minInterval  : 1800,
  maxInterval  : 5600,
  doubleChance : 0.25,
  doubleGap    : 90,
  keyframes    : [
    { transform: 'scaleY(1)' },
    { transform: 'scaleY(0.1)' },
    { transform: 'scaleY(1)' },
  ],
};

export const GAZE = {
  maxOffset : 0.018,
  smoothing : 0.12,
  range     : 260,
};

export const FIXED_GAZE: Record<'working' | 'confused', Point> = {
  working  : { x: 0, y: 0.7 },
  confused : { x: 0.7, y: -0.7 },
};

export const MOUTH_POP = {
  duration  : 160,
  keyframes : [
    { transform: 'scale(0.75)' },
    { transform: 'scale(1)' },
  ],
};

export const ALERT = {
  duration  : 420,
  eyeScale  : 1.1,
  keyframes : [
    { transform: 'translateY(0%) scale(1, 1)' },
    { transform: 'translateY(-3%) scale(0.97, 1.05)' },
  ],
};

export const CONFUSED = {
  duration      : 500,
  holdTime      : 2000,
  rightEyeScale : 0.78,
  keyframes     : [
    { transform: 'rotate(0deg)' },
    { transform: 'rotate(-6deg)' },
  ],
};

export const WORKING = {
  duration  : 520,
  keyframes : [
    { transform: 'rotate(-2deg)' },
    { transform: 'rotate(2deg)' },
  ],
};

export const HAPPY = {
  duration  : 760,
  jumps     : 2,
  keyframes : [
    { transform: 'translateY(0%) scale(1, 1)' },
    { transform: 'translateY(0%) scale(1.1, 0.88)', offset: 0.18 },
    { transform: 'translateY(-12%) scale(0.94, 1.08)', offset: 0.45 },
    { transform: 'translateY(0%) scale(1.04, 0.96)', offset: 0.78 },
    { transform: 'translateY(0%) scale(1, 1)' },
  ],
};

export const EATING = {
  flightDuration  : 720,
  swallowDuration : 260,
  chewDuration    : 820,
  happyTime       : 800,
  flightEasing    : 'cubic-bezier(.45,.05,.55,.95)',
  chewKeyframes   : [
    { transform: 'translateY(0%) scale(1, 1)' },
    { transform: 'translateY(0%) scale(1.1, 0.88)', offset: 0.25 },
    { transform: 'translateY(-5%) scale(0.94, 1.08)', offset: 0.55 },
    { transform: 'translateY(0%) scale(1.04, 0.97)', offset: 0.8 },
    { transform: 'translateY(0%) scale(1, 1)' },
  ],
};
