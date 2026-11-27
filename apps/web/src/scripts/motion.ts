// Loads the animations (GSAP, motion-scenes.ts) only when they cannot slow the page down, and never
// with reduced motion; without them the page is already complete. The floating starts once the page has
// loaded and the browser is free; what follows the scroll (parallax, Glup eating) needs to measure the
// whole page, so it waits for the first scroll, touch or key.
const motion = window.matchMedia('(prefers-reduced-motion: no-preference)');
const FIRST  = ['scroll', 'wheel', 'touchstart', 'keydown', 'pointerdown'] as const;

let scenes: Promise<typeof import('@/scripts/motion-scenes')> | null = null;

const load = () => (scenes ??= import('@/scripts/motion-scenes'));

const onFirst = (): void => {
  FIRST.forEach((name) => window.removeEventListener(name, onFirst));
  void load().then(({ startScrolling }) => startScrolling());
};

const begin = (): void => {
  const floating = (): void => void load().then(({ startFloating }) => startFloating());

  if ('requestIdleCallback' in window) requestIdleCallback(floating);
  else setTimeout(floating, 300);

  FIRST.forEach((name) => window.addEventListener(name, onFirst, { passive: true }));
};

const whenWelcome = (): void => {
  if (motion.matches) return begin();
  motion.addEventListener('change', () => motion.matches && begin(), { once: true });
};

if (document.readyState === 'complete') whenWelcome();
else window.addEventListener('load', whenWelcome, { once: true });
