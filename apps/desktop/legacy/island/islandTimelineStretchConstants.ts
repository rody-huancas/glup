import type { RevealGroup } from '@/shared/types/revealGroup';

// Durations in seconds, as GSAP expects.
export const OPEN_MOTION = {
  stretch : { duration: 0.18, ease: 'power3.out' },
  drop    : { duration: 0.32, ease: 'back.out(1.4)', startAt: 0.7 },
  flight  : { duration: 0.4, ease: 'power2.inOut' },
  squash  : { duration: 0.15, ease: 'power2.out', scaleY: 0.9, impact: 0.04, origin: '50% 100%' },
  content : { duration: 0.15, ease: 'power2.out' },
  reveal  : { duration: 0.25, ease: 'power2.out', startAt: 0.55 },
};

export const CLOSE_MOTION = {
  content : { duration: 0.08, ease: 'power1.in' },
  flight  : { duration: 0.22, ease: 'power2.in' },
  lift    : { duration: 0.16, ease: 'power3.in' },
  shrink  : { duration: 0.12, ease: 'power2.in' },
};

export const REVEAL_FROM: Record<RevealGroup, gsap.TweenVars> = {
  nav     : { x: -12, opacity: 0 },
  heading : { y: 8, opacity: 0 },
  card    : { y: 10, opacity: 0, scale: 0.98 },
};

export const REVEAL_TO: gsap.TweenVars = { x: 0, y: 0, opacity: 1, scale: 1 };

export const REVEAL_STAGGER: Record<RevealGroup, number> = {
  nav     : 0.03,
  heading : 0.03,
  card    : 0.025,
};

// Offset of each group from the start of the cascade.
export const REVEAL_OFFSET: Record<RevealGroup, number> = {
  nav     : 0,
  heading : 0.03,
  card    : 0.06,
};

export const REDUCED_MOTION = {
  query : '(prefers-reduced-motion: reduce)',
  fade  : { duration: 0.12, ease: 'power1.out' },
};
