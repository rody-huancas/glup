import type { RevealGroup } from '@/shared/types/revealGroup';

// Durations in seconds, as GSAP expects.
export const OPEN_MOTION = {
  anticipation : { duration: 0.12, ease: 'power2.in' },
  expansion    : { duration: 0.75, ease: 'elastic.out(1, 0.75)' },
  // expansion    : { duration: 0.75, ease: 'elastic.out(1, 0.55)' },
  colors       : { duration: 0.3, ease: 'power2.out' },
  flight       : { duration: 0.55, ease: 'back.out(1.3)' },
  squash       : { impact: 0.05, duration: 0.25, ease: 'elastic.out(1, 0.5)', scaleX: 1.06, scaleY: 0.92, origin: '50% 100%' },
  content      : { duration: 0.15, ease: 'power2.out' },
  reveal       : { startAt: 0.25, duration: 0.35, ease: 'power3.out', blockStagger: 0.06, itemStagger: 0.015 },
  // reveal       : { startAt: 0.35, duration: 0.35, ease: 'power3.out', stagger: 0.04 },
};

export const CLOSE_MOTION = {
  content : { duration: 0.12, ease: 'power2.in', y: 6 },
  flight  : { duration: 0.35, ease: 'power3.inOut' },
  shrink  : { startAt: 0.06, duration: 0.32, ease: 'power3.inOut' },
  settle  : { impact: 0.06, duration: 0.22, ease: 'elastic.out(1, 0.4)' },
  // settle  : { impact: 0.06, duration: 0.3, ease: 'elastic.out(1, 0.4)' },
};

export const HOVER_MOTION = {
  inflate : { duration: 0.15, ease: 'back.out(2)' },
  deflate : { duration: 0.3, ease: 'elastic.out(1, 0.5)' },
};

// Blocks revealed one after another: menu, heading, drop zone and recent items, quick tools.
export const REVEAL_BLOCKS: readonly RevealGroup[] = ['nav', 'heading', 'card', 'tool'];
// export const REVEAL_ORDER = ['nav', 'heading', 'card'] as const;

export const REVEAL_FROM: gsap.TweenVars = { y: 12, opacity: 0, scale: 0.96 };

export const REVEAL_TO: gsap.TweenVars = { x: 0, y: 0, opacity: 1, scale: 1 };

export const REDUCED_MOTION = {
  query : '(prefers-reduced-motion: reduce)',
  fade  : { duration: 0.15, ease: 'power1.out' },
  // fade  : { duration: 0.12, ease: 'power1.out' },
};

// Stretch-and-drop version (full copy in legacy/island/islandTimelineStretchConstants.ts).
// export const OPEN_MOTION = {
//   stretch : { duration: 0.18, ease: 'power3.out' },
//   drop    : { duration: 0.32, ease: 'back.out(1.4)', startAt: 0.7 },
//   flight  : { duration: 0.4, ease: 'power2.inOut' },
//   squash  : { duration: 0.15, ease: 'power2.out', scaleY: 0.9, impact: 0.04, origin: '50% 100%' },
//   content : { duration: 0.15, ease: 'power2.out' },
//   reveal  : { duration: 0.25, ease: 'power2.out', startAt: 0.55 },
// };
//
// export const CLOSE_MOTION = {
//   content : { duration: 0.08, ease: 'power1.in' },
//   flight  : { duration: 0.22, ease: 'power2.in' },
//   lift    : { duration: 0.16, ease: 'power3.in' },
//   shrink  : { duration: 0.12, ease: 'power2.in' },
// };
//
// export const REVEAL_FROM: Record<RevealGroup, gsap.TweenVars> = {
//   nav     : { x: -12, opacity: 0 },
//   heading : { y: 8, opacity: 0 },
//   card    : { y: 10, opacity: 0, scale: 0.98 },
// };
//
// export const REVEAL_STAGGER: Record<RevealGroup, number> = { nav: 0.03, heading: 0.03, card: 0.025 };
//
// export const REVEAL_OFFSET: Record<RevealGroup, number> = { nav: 0, heading: 0.03, card: 0.06 };
