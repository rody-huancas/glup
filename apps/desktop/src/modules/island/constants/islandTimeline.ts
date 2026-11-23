import type { RevealGroup } from '@/shared/types/revealGroup';

// Durations in seconds, as GSAP expects.
export const OPEN_MOTION = {
  anticipation : { duration: 0.12, ease: 'power2.in' },
  expansion    : { duration: 0.75, ease: 'elastic.out(1, 0.75)' },
  colors       : { duration: 0.3, ease: 'power2.out' },
  flight       : { duration: 0.55, ease: 'back.out(1.3)' },
  squash       : { impact: 0.05, duration: 0.25, ease: 'elastic.out(1, 0.5)', scaleX: 1.06, scaleY: 0.92, origin: '50% 100%' },
  content      : { duration: 0.15, ease: 'power2.out' },
  reveal       : { startAt: 0.25, duration: 0.35, ease: 'power3.out', blockStagger: 0.06, itemStagger: 0.015 },
};

export const CLOSE_MOTION = {
  content : { duration: 0.12, ease: 'power2.in', y: 6 },
  flight  : { duration: 0.35, ease: 'power3.inOut' },
  // startAt: after the goodbye wave · leaveStartAt: when the cursor left (about 0.6 s in total).
  shrink  : { startAt: 0.34, leaveStartAt: 0.06, duration: 0.32, ease: 'power3.inOut' },
  settle  : { impact: 0.06, duration: 0.22, ease: 'elastic.out(1, 0.4)' },
};

// Seconds. The notice grows with the same elastic as the panel, holds and goes back.
export const NOTICE_MOTION = {
  grow   : { duration: 0.6, ease: 'elastic.out(1, 0.75)' },
  flight : { duration: 0.4, ease: 'back.out(1.4)' },
  text   : { duration: 0.25, delay: 0.15, ease: 'power2.out' },
  hold   : 4,
};

export const HOVER_MOTION = {
  inflate : { duration: 0.15, ease: 'back.out(2)' },
  deflate : { duration: 0.3, ease: 'elastic.out(1, 0.5)' },
};

// Blocks revealed one after another: menu, heading, drop zone and recent items, quick tools.
export const REVEAL_BLOCKS: readonly RevealGroup[] = ['nav', 'heading', 'card', 'tool'];

export const REVEAL_FROM: gsap.TweenVars = { y: 12, opacity: 0, scale: 0.96 };

export const REVEAL_TO: gsap.TweenVars = { x: 0, y: 0, opacity: 1, scale: 1 };

export const REDUCED_MOTION = {
  query : '(prefers-reduced-motion: reduce)',
  fade  : { duration: 0.15, ease: 'power1.out' },
};
