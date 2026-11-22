import gsap from 'gsap';
import { MASCOT_IDLE, MASCOT_MOTION } from '@/modules/island/constants/islandMascot';
import type { IdleMoveKind } from '@/modules/island/types/idleMove';
import type { MascotController } from '@/modules/mascot/interfaces/controller';

interface IdleMoveParams {
  kind       : IdleMoveKind;
  controller : MascotController;
  lift       : HTMLElement;
  squash     : HTMLElement;
}

interface HopParams {
  timeline : gsap.core.Timeline;
  lift     : HTMLElement;
  at       : number;
}

const getEyeWrappers = (controller: MascotController): HTMLElement[] =>
  [controller.elements.eyeLeft.wrapper.current, controller.elements.eyeRight.wrapper.current].filter(
    (eye): eye is HTMLDivElement => eye !== null,
  );

export const scaleEyes = (controller: MascotController, scale: number) => {
  const eyes = getEyeWrappers(controller);
  if (eyes.length === 0) return;

  gsap.to(eyes, { scale, duration: MASCOT_MOTION.eyes.duration, ease: MASCOT_MOTION.eyes.ease, overwrite: 'auto' });
};

// A little jump in screen pixels: up fast, then down with a soft overshoot.
export const addHop = ({ timeline, lift, at }: HopParams): gsap.core.Timeline => {
  const { height, up, upEase, down, downEase } = MASCOT_MOTION.hop;

  return timeline
    .to(lift, { y: -height, duration: up, ease: upEase }, at)
    .to(lift, { y: 0, duration: down, ease: downEase }, at + up);
};

const buildLook = (controller: MascotController): gsap.core.Timeline => {
  const { left, right, hold } = MASCOT_IDLE.look;

  return gsap
    .timeline()
    .call(() => controller.look(left))
    .call(() => controller.look(right), undefined, hold)
    .call(() => controller.look(null), undefined, hold * 2);
};

// Sways from its feet like dancing to the headphones: -4°, 4°, twice, then back to straight.
const buildSway = (squash: HTMLElement): gsap.core.Timeline => {
  const { angle, beat, swings, ease } = MASCOT_IDLE.sway;
  const timeline                      = gsap.timeline();

  for (let swing = 0; swing < swings; swing += 1) {
    timeline.to(squash, { rotation: -angle, duration: beat, ease }).to(squash, { rotation: angle, duration: beat, ease });
  }

  return timeline.to(squash, { rotation: 0, duration: beat, ease });
};

export const buildIdleMove = ({ kind, controller, lift, squash }: IdleMoveParams): gsap.core.Timeline => {
  if (kind === 'look') return buildLook(controller);
  if (kind === 'sway') return buildSway(squash);
  if (kind === 'stretch' || kind === 'tap-dance') return gsap.timeline().call(() => void controller.gesture(kind));
  return addHop({ timeline: gsap.timeline(), lift, at: 0 });
};

export const pickIdleMove = (): IdleMoveKind => gsap.utils.random(MASCOT_IDLE.moves);
