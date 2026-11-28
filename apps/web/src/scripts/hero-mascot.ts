// The hero's Glup (art/glup-art.astro), alive: it breathes, its leaf sways, it blinks now and then and its
// eyes follow the cursor (a little, never out of their place); now and then it eats the floating file that
// is closest, with its «ñam». With the cursor (or the focus) on it, it grins and hops; clicked (or with the
// «Saludar a Glup» button), it jumps and waves. Only called inside gsap.matchMedia (motion welcome).
import { gsap } from 'gsap';

const FROM_BOTTOM = '50% 100%';

// The drawing's width in its own units (viewBox), to turn screen pixels into them.
const VIEW_WIDTH = 656;

// How far the eyes go, as a share of Glup's width, and where they look from (share of its box).
const EYE_REACH = 0.022;
const EYES_AT   = { x: 0.53, y: 0.47 };

const centre = (element: Element): { x: number; y: number } => {
  const box = element.getBoundingClientRect();
  return { x: box.left + box.width / 2, y: box.top + box.height / 2 };
};

// Returns what has to be undone when the motion goes away (listeners, pending calls, the button).
export const animateMascot = (isVisible: () => boolean): (() => void) => {
  const holder = document.querySelector<HTMLElement>('[data-hero-glup]');
  const figure = holder?.querySelector<SVGSVGElement>('[data-glup-art]');
  const poke   = document.querySelector<HTMLButtonElement>('[data-glup-poke]');
  if (!holder || !figure) return () => {};

  const eyes   = gsap.utils.toArray<SVGGElement>('[data-glup-eye]', figure);
  const leaf   = figure.querySelector('[data-glup-leaf]');
  const cheeks = figure.querySelector('[data-glup-cheeks]');
  const open   = figure.querySelector('[data-glup-mouth="open"]');
  const smile  = figure.querySelector('[data-glup-mouth="smile"]');
  const arm    = figure.querySelector('[data-glup-arm="right"]');
  const wave   = figure.querySelector('[data-glup-arm="wave"]');
  const bubble = document.querySelector('[data-hero-bubble]');
  const snacks = gsap.utils.toArray<HTMLElement>('[data-snack]');
  const calls: gsap.core.Tween[] = [];

  let busy     = false;
  let grinning = false;

  // Breathing: a slow squash from the feet, on the whole drawing; the gulp, the hop and the jump move the
  // holder, so they never cut the breathing.
  gsap.to(figure, { scaleY: 1.025, scaleX: 0.99, duration: 1.8, ease: 'sine.inOut', yoyo: true, repeat: -1, transformOrigin: FROM_BOTTOM });

  // The leaf sways from its stem, one way and the other, back through its place.
  gsap.timeline({ repeat: -1, defaults: { ease: 'sine.inOut', transformOrigin: '30% 95%' } })
    .to(leaf, { rotation: 6, duration: 1.1 })
    .to(leaf, { rotation: -5, duration: 1.4 })
    .to(leaf, { rotation: 0, duration: 1.1 });

  const blink = (): void => {
    gsap.to(eyes, { scaleY: 0.12, duration: 0.07, yoyo: true, repeat: 1, ease: 'power1.inOut', transformOrigin: '50% 60%' });
    calls.push(gsap.delayedCall(gsap.utils.random(2.5, 6), blink));
  };
  calls.push(gsap.delayedCall(gsap.utils.random(1.5, 3), blink));

  // The eyes look toward the cursor, at most EYE_REACH of Glup's width away from their place (moved in
  // the drawing's own units).
  const lookX = eyes.map((eye) => gsap.quickTo(eye, 'x', { duration: 0.35, ease: 'power2.out' }));
  const lookY = eyes.map((eye) => gsap.quickTo(eye, 'y', { duration: 0.35, ease: 'power2.out' }));
  const look  = (event: PointerEvent): void => {
    if (!isVisible()) return;
    const box      = figure.getBoundingClientRect();
    const units    = VIEW_WIDTH / box.width;
    const reach    = box.width * EYE_REACH;
    const dx       = event.clientX - (box.left + box.width * EYES_AT.x);
    const dy       = event.clientY - (box.top + box.height * EYES_AT.y);
    const distance = Math.hypot(dx, dy) || 1;
    const amount   = Math.min(reach, distance / 12) * units;
    lookX.forEach((to) => to((dx / distance) * amount));
    lookY.forEach((to) => to((dy / distance) * amount * 0.8));
  };
  window.addEventListener('pointermove', look, { passive: true });

  const mouthOpen = (opened: boolean): gsap.core.Timeline => gsap.timeline()
    .to(open, { opacity: opened ? 1 : 0, duration: 0.12 })
    .to(smile, { opacity: opened ? 0 : 1, duration: 0.12 }, '<');

  // Now and then, the visible floating file closest to the mouth flies in; it comes back a moment later.
  const eat = (): void => {
    calls.push(gsap.delayedCall(gsap.utils.random(7, 11), eat));
    if (busy || grinning || !open || !isVisible()) return;

    const mouth  = centre(open);
    const shown  = snacks.filter((snack) => snack.offsetParent !== null);
    const target = shown.sort((a, b) => {
      const [first, second] = [centre(a), centre(b)];
      return Math.hypot(first.x - mouth.x, first.y - mouth.y) - Math.hypot(second.x - mouth.x, second.y - mouth.y);
    })[0];
    if (!target) return;

    busy = true;
    const from = centre(target);
    gsap.timeline({ onComplete: () => void (busy = false) })
      .add(mouthOpen(true))
      .to(target, { x: mouth.x - from.x, y: mouth.y - from.y, scale: 0.15, rotation: 30, duration: 0.7, ease: 'power2.in' }, '<')
      .set(target, { opacity: 0 })
      .add(mouthOpen(false))
      .to(holder, { scaleY: 0.9, scaleX: 1.07, duration: 0.12, ease: 'power1.out', transformOrigin: FROM_BOTTOM }, '<')
      .to(holder, { scaleY: 1, scaleX: 1, duration: 0.7, ease: 'elastic.out(1, 0.4)', transformOrigin: FROM_BOTTOM })
      .fromTo(bubble, { scale: 0.6 }, { scale: 1, duration: 0.5, ease: 'back.out(3)', transformOrigin: '30% 100%' }, '<')
      .set(target, { x: 0, y: 0, rotation: 0, scale: 0, opacity: 1 }, '+=1.4')
      .to(target, { scale: 1, duration: 0.5, ease: 'back.out(2)' });
  };
  calls.push(gsap.delayedCall(gsap.utils.random(3, 5), eat));

  // With the cursor or the focus on it: a big grin, rosier cheeks and a little hop; it smiles again when
  // they leave. Eating or waving goes first.
  const grin = (): void => {
    if (busy || grinning) return;
    grinning = true;
    mouthOpen(true);
    gsap.to(cheeks, { scale: 1.12, duration: 0.25, ease: 'back.out(2)', transformOrigin: '50% 50%' });
    gsap.timeline()
      .to(holder, { y: -14, duration: 0.18, ease: 'power2.out' })
      .to(holder, { y: 0, duration: 0.45, ease: 'bounce.out' });
  };

  const calm = (): void => {
    if (!grinning) return;
    grinning = false;
    if (!busy) mouthOpen(false);
    gsap.to(cheeks, { scale: 1, duration: 0.3, ease: 'sine.out' });
  };

  // A jump and a wave: the arm swaps for the waving one, which swings a few times.
  const hello = (): void => {
    if (busy) return;
    busy = true;
    gsap.timeline({ onComplete: () => void (busy = false) })
      .to(holder, { y: -36, duration: 0.25, ease: 'power2.out' })
      .to(holder, { y: 0, duration: 0.55, ease: 'bounce.out' })
      .set(arm, { opacity: 0 }, 0.1)
      .set(wave, { opacity: 1 }, 0.1)
      .fromTo(wave, { rotation: -10 }, { rotation: 18, duration: 0.22, ease: 'sine.inOut', yoyo: true, repeat: 5, transformOrigin: '12% 88%' }, 0.1)
      .set(wave, { opacity: 0, rotation: 0 })
      .set(arm, { opacity: 1 });
  };

  if (poke) poke.hidden = false;
  poke?.addEventListener('click', hello);
  poke?.addEventListener('pointerenter', grin);
  poke?.addEventListener('pointerleave', calm);
  poke?.addEventListener('focus', grin);
  poke?.addEventListener('blur', calm);

  return () => {
    window.removeEventListener('pointermove', look);
    poke?.removeEventListener('click', hello);
    poke?.removeEventListener('pointerenter', grin);
    poke?.removeEventListener('pointerleave', calm);
    poke?.removeEventListener('focus', grin);
    poke?.removeEventListener('blur', calm);
    if (poke) poke.hidden = true;
    calls.forEach((call) => call.kill());
  };
};
