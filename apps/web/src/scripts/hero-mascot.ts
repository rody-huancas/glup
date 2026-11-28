// The hero's Glup (art/glup-art.astro), alive: it breathes, its leaf sways, it blinks now and then and its
// eyes follow the cursor (a little, never out of their place). While it rests, every 6–12 s it plays a
// short routine (glup-routines.ts), never the same twice in a row, only once its entrance is over and
// while the hero is on screen and the tab visible. With the cursor (or the focus) on it, the routine ends
// softly and it grins and hops; clicked (or with the «Saludar a Glup» button), it jumps and waves. Only
// called inside gsap.matchMedia (motion welcome).
import { gsap } from 'gsap';
import { isRoutine, pickRoutine, routineRest, type RoutineName } from '@/lib/glup-routine-picker';
import { FROM_BOTTOM, ROUTINE_PLAYERS, findParts, placeArms, prepareParts, settle, showMouth, waving } from '@/scripts/glup-routines';

// The drawing's width in its own units (viewBox), to turn screen pixels into them.
const VIEW_WIDTH = 656;

// How far the eyes go, as a share of Glup's width, and where they look from (share of its box).
const EYE_REACH = 0.022;
const EYES_AT   = { x: 0.53, y: 0.47 };

// Seconds before trying again when Glup cannot start a routine yet (busy, hidden, still entering).
const RETRY = 1.5;

// Whether the CSS entrance (motion.css) is over: no animation of its own still running or waiting.
const entered = (holder: HTMLElement): boolean =>
  holder.getAnimations().every((animation) => animation.playState !== 'running');

// Returns what has to be undone when the motion goes away (listeners, pending calls, the button).
export const animateMascot = (isVisible: () => boolean): (() => void) => {
  const holder = document.querySelector<HTMLElement>('[data-hero-glup]');
  const parts  = holder ? findParts(holder) : null;
  const poke   = document.querySelector<HTMLButtonElement>('[data-glup-poke]');
  if (!holder || !parts) return () => {};

  const { figure, eyes, leaf, cheeks, mouths } = parts;
  prepareParts(parts);
  const calls: gsap.core.Tween[] = [];

  let routine: gsap.core.Timeline | null = null;
  let pending: gsap.core.Tween | null    = null;
  let last: RoutineName | null           = null;
  let busy                               = false;
  let grinning                           = false;
  let hovered                            = false;

  // Breathing: a slow squash from the feet, on the whole drawing; routines, the hop and the jump move the
  // holder, so they never cut the breathing.
  gsap.to(figure, { scaleY: 1.025, scaleX: 0.99, duration: 1.8, ease: 'sine.inOut', yoyo: true, repeat: -1, transformOrigin: FROM_BOTTOM });

  // The leaf sways from its stem, one way and the other, back through its place.
  gsap.timeline({ repeat: -1, defaults: { ease: 'sine.inOut' } })
    .to(leaf, { rotation: 6, duration: 1.1 })
    .to(leaf, { rotation: -5, duration: 1.4 })
    .to(leaf, { rotation: 0, duration: 1.1 });

  // Blinks wait while a routine moves the eyes.
  const blink = (): void => {
    if (!routine) gsap.to(eyes, { scaleY: 0.12, duration: 0.07, yoyo: true, repeat: 1, ease: 'power1.inOut' });
    calls.push(gsap.delayedCall(gsap.utils.random(2.5, 6), blink));
  };
  calls.push(gsap.delayedCall(gsap.utils.random(1.5, 3), blink));

  // The eyes look toward the cursor, at most EYE_REACH of Glup's width away from their place (moved in
  // the drawing's own units); not while a routine has them looking elsewhere.
  const lookX = eyes.map((eye) => gsap.quickTo(eye, 'x', { duration: 0.35, ease: 'power2.out' }));
  const lookY = eyes.map((eye) => gsap.quickTo(eye, 'y', { duration: 0.35, ease: 'power2.out' }));
  const look  = (event: PointerEvent): void => {
    if (routine || !isVisible()) return;
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

  // The routines: one at a time, after a rest, when Glup is free and someone can see it.
  const free = (): boolean => !routine && !busy && !grinning && isVisible() && !document.hidden && entered(holder);

  const play = (name: RoutineName): void => {
    last    = name;
    routine = ROUTINE_PLAYERS[name](parts);
    // A routine with nothing to do (no file on screen to eat) is over at once.
    if (routine.duration() === 0) {
      routine = null;
      return rest();
    }
    routine.eventCallback('onComplete', () => {
      routine = null;
      rest();
    });
  };

  const next = (choose: () => RoutineName): void => {
    pending = gsap.delayedCall(free() ? 0 : RETRY, () => (free() ? play(choose()) : next(choose)));
  };

  const rest = (): void => {
    pending?.kill();
    pending = gsap.delayedCall(routineRest(Math.random), () => next(() => pickRoutine({ last, random: Math.random })));
  };

  // Whatever routine is on stops and Glup settles back, then does what was asked.
  const interrupt = (then: () => void): void => {
    if (!routine) return then();
    routine.kill();
    routine = null;
    settle(parts).eventCallback('onComplete', then);
    rest();
  };

  // With the cursor or the focus on it: a big grin, rosier cheeks and a little hop; it smiles again when
  // they leave.
  const grin = (): void => {
    if (busy || grinning || !hovered) return;
    grinning = true;
    showMouth(mouths, 'open');
    gsap.to(cheeks, { scale: 1.12, duration: 0.25, ease: 'back.out(2)' });
    gsap.timeline()
      .to(holder, { y: -14, duration: 0.18, ease: 'power2.out' })
      .to(holder, { y: 0, duration: 0.45, ease: 'bounce.out' });
  };

  const come = (): void => {
    hovered = true;
    interrupt(grin);
  };

  const leave = (): void => {
    hovered = false;
    if (!grinning) return;
    grinning = false;
    if (!busy) showMouth(mouths, 'smile');
    gsap.to(cheeks, { scale: 1, duration: 0.3, ease: 'sine.out' });
  };

  // A jump and a wave: the right arm goes up from the shoulder and swings a few times.
  const hello = (): void => {
    if (busy) return;
    busy = true;
    gsap.timeline({ onComplete: () => void (busy = false) })
      .to(holder, { y: -36, duration: 0.25, ease: 'power2.out' })
      .to(holder, { y: 0, duration: 0.55, ease: 'bounce.out' })
      .add(waving(parts, 3), 0.1);
  };

  const poked = (): void => interrupt(hello);

  // In development, ?glup=<routine> plays that routine as soon as Glup can (to review each one).
  const asked = import.meta.env.DEV ? new URLSearchParams(window.location.search).get('glup') : null;
  if (isRoutine(asked)) next(() => asked);
  else rest();

  if (poke) poke.hidden = false;
  poke?.addEventListener('click', poked);
  poke?.addEventListener('pointerenter', come);
  poke?.addEventListener('pointerleave', leave);
  poke?.addEventListener('focus', come);
  poke?.addEventListener('blur', leave);

  return () => {
    window.removeEventListener('pointermove', look);
    poke?.removeEventListener('click', poked);
    poke?.removeEventListener('pointerenter', come);
    poke?.removeEventListener('pointerleave', leave);
    poke?.removeEventListener('focus', come);
    poke?.removeEventListener('blur', leave);
    if (poke) poke.hidden = true;
    routine?.kill();
    pending?.kill();
    placeArms(parts, false);
    calls.forEach((call) => call.kill());
  };
};
