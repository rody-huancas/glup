// The keycap logotype of the hero, alive (its entrance is CSS, motion.css): every 6–8 s a little file of a
// family's color falls on the «u» key, which sinks like a pressed key, swallows it and springs back; under
// the cursor the keys are typed one after another. Only called inside gsap.matchMedia (motion welcome).
import { gsap } from 'gsap';

const SNACK_COLORS = ['--color-lilac', '--color-coral', '--color-yellow', '--color-sky', '--color-mint', '--color-silver'];

// How far a key's top sinks into its side, in the key's own units (viewBox 150 x 166).
const PRESS = 14;

const press = (top: Element | null, at: number, timeline: gsap.core.Timeline): void => void timeline
  .to(top, { y: PRESS, duration: 0.08, ease: 'power1.in' }, at)
  .to(top, { y: 0, duration: 0.45, ease: 'back.out(3)' }, at + 0.08);

// Returns what has to be undone when the motion goes away (the listener and the pending call).
export const animateLogo = (isVisible: () => boolean): (() => void) => {
  const logo = document.querySelector<HTMLElement>('[data-logo]');
  if (!logo) return () => {};

  const tops   = gsap.utils.toArray<SVGGElement>('[data-logo-letter] [data-key-top]', logo);
  const mouth  = logo.querySelector('[data-logo-letter="U"] [data-key-top]');
  const snack  = logo.querySelector<SVGSVGElement>('[data-logo-snack]');
  const face   = logo.querySelector('[data-logo-snack-face]');
  const styles = getComputedStyle(document.documentElement);
  const colors = SNACK_COLORS.map((name) => styles.getPropertyValue(name).trim());

  let next: gsap.core.Tween | null = null;
  let busy = false;

  const eat = (): void => {
    next = gsap.delayedCall(gsap.utils.random(6, 8), eat);
    if (!mouth || !snack || !face || busy || !isVisible()) return;

    busy = true;
    gsap.set(face, { fill: gsap.utils.random(colors) });
    // From the strip above the keys (it fades in there) to the middle of the «u» key's face, measured
    // from its resting place (it is invisible between bites, so putting it back never shows).
    gsap.set(snack, { y: 0, scale: 1, rotation: 0 });
    const from     = snack.getBoundingClientRect();
    const keyTop   = mouth.getBoundingClientRect();
    const drop     = keyTop.top + keyTop.height * 0.45 - (from.top + from.height / 2);
    const timeline = gsap.timeline({ onComplete: () => void (busy = false) })
      .fromTo(snack, { y: 0, opacity: 0, rotation: -14, scale: 1 }, { y: drop, rotation: 16, duration: 0.55, ease: 'power2.in' })
      .to(snack, { opacity: 1, duration: 0.15, ease: 'none' }, 0)
      .to(snack, { opacity: 0, scale: 0.5, duration: 0.08 });
    press(mouth, 0.5, timeline);
  };

  next = gsap.delayedCall(4, eat);

  // Typed in a row by the cursor.
  const type = (): void => {
    if (busy) return;
    const timeline = gsap.timeline();
    tops.forEach((top, index) => press(top, index * 0.09, timeline));
  };

  logo.addEventListener('pointerenter', type);

  return () => {
    logo.removeEventListener('pointerenter', type);
    next?.kill();
  };
};
