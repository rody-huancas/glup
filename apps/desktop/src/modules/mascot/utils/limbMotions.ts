import gsap from 'gsap';
import { MASCOT_LAYOUT } from '@/modules/mascot/constants/layout';
import { LIMB_MOTION, LIMB_NAMES } from '@/modules/mascot/constants/limbs';
import type { MascotElements } from '@/modules/mascot/interfaces/elements';
import type { MascotGesture } from '@/modules/mascot/types/mascotGesture';
import type { MascotStateType } from '@/modules/mascot/types/mascotState';

export interface LimbTargets {
  armLeft   : HTMLElement;
  armRight  : HTMLElement;
  armWave   : HTMLElement;
  footLeft  : HTMLElement;
  footRight : HTMLElement;
  body      : HTMLElement | null;
}

export const resolveLimbs = (elements: MascotElements): LimbTargets | null => {
  const { limbs } = elements;
  const [armLeft, armRight, armWave] = [limbs['arm-left'].move.current, limbs['arm-right'].move.current, limbs['arm-wave'].move.current];
  const [footLeft, footRight]        = [limbs['foot-left'].move.current, limbs['foot-right'].move.current];

  if (!armLeft || !armRight || !armWave || !footLeft || !footRight) return null;
  return { armLeft, armRight, armWave, footLeft, footRight, body: elements.act.current };
};

// GSAP rotates around each piece's pivot from layout (the same transform-origin the markup sets).
export const applyPivots = (elements: MascotElements) => {
  LIMB_NAMES.forEach((name) => {
    const pivot = MASCOT_LAYOUT.pieces[name].pivot;
    if (!pivot) return;

    const { sway, move } = elements.limbs[name];
    const targets        = [sway.current, move.current].filter((element): element is HTMLDivElement => element !== null);

    if (targets.length > 0) gsap.set(targets, { transformOrigin: `${pivot.x}% ${pivot.y}%` });
  });
};

export const getSwayTargets = (elements: MascotElements): HTMLElement[] =>
  [elements.limbs['arm-left'].sway.current, elements.limbs['arm-right'].sway.current].filter(
    (element): element is HTMLDivElement => element !== null,
  );

// Back to rest: arms and feet straight, arm-right in place of arm-wave.
export const resetLimbs = (limbs: LimbTargets, duration: number = LIMB_MOTION.reset) => {
  gsap.killTweensOf([limbs.armLeft, limbs.armRight, limbs.armWave, limbs.footLeft, limbs.footRight]);
  gsap.to([limbs.armLeft, limbs.armRight, limbs.footLeft, limbs.footRight], { rotation: 0, xPercent: 0, yPercent: 0, duration, ease: 'power2.out' });
  gsap.set(limbs.armWave, { autoAlpha: 0, rotation: 0 });
  gsap.set(limbs.armRight, { autoAlpha: 1 });
};

// Breathing: the arms swing a little, half a beat after the body.
export const buildBreathSway = (arms: HTMLElement[]): gsap.core.Tween | null => {
  if (arms.length === 0) return null;

  const { angle, duration, phase } = LIMB_MOTION.breath;

  return gsap.fromTo(
    arms,
    { rotation: (index: number) => (index === 0 ? -angle : angle) },
    { rotation: (index: number) => (index === 0 ? angle : -angle), duration, ease: 'sine.inOut', yoyo: true, repeat: -1, delay: phase },
  );
};

// One foot taps once (rotate and back), like keeping the beat.
export const buildFootTap = (limbs: LimbTargets): gsap.core.Timeline => {
  const { angle, down, up } = LIMB_MOTION.tap;
  const left                = Math.random() < 0.5;
  const foot                = left ? limbs.footLeft : limbs.footRight;
  const rotation            = left ? angle : -angle;

  return gsap.timeline().to(foot, { rotation, duration: down, ease: 'power2.out' }).to(foot, { rotation: 0, duration: up, ease: 'power2.in' });
};

const buildAlert = (limbs: LimbTargets): gsap.core.Timeline => {
  const { inward, outward, beat } = LIMB_MOTION.rub;

  // Rubbing hands: both arms turn inward and move alternately, fast, for the whole state.
  return gsap
    .timeline({ repeat: -1 })
    .to(limbs.armLeft, { rotation: inward, duration: beat, ease: 'sine.inOut' }, 0)
    .to(limbs.armRight, { rotation: -outward, duration: beat, ease: 'sine.inOut' }, 0)
    .to(limbs.armLeft, { rotation: outward, duration: beat, ease: 'sine.inOut' }, beat)
    .to(limbs.armRight, { rotation: -inward, duration: beat, ease: 'sine.inOut' }, beat);
};

const buildEating = (limbs: LimbTargets): gsap.core.Timeline => {
  const { raise, lift, up, hold, down } = LIMB_MOTION.eating;
  const arms                            = [limbs.armLeft, limbs.armRight];

  // Arms go up to the mouth while the file flies in, and down when it is swallowed.
  return gsap
    .timeline()
    .to(arms, { rotation: (index: number) => (index === 0 ? raise : -raise), yPercent: lift, duration: up, ease: 'back.out(1.6)' })
    .to(arms, { rotation: 0, yPercent: 0, duration: down, ease: 'power2.in' }, up + hold);
};

const buildWorking = (limbs: LimbTargets): gsap.core.Timeline => {
  const { angle, beat, footAngle } = LIMB_MOTION.working;

  // Hands busy (arms alternate) and feet tapping the floor alternately.
  return gsap
    .timeline({ repeat: -1 })
    .to(limbs.armLeft, { rotation: angle, duration: beat, ease: 'sine.inOut' }, 0)
    .to(limbs.armRight, { rotation: 0, duration: beat, ease: 'sine.inOut' }, 0)
    .to(limbs.footLeft, { rotation: footAngle, duration: beat / 2, ease: 'power2.out', yoyo: true, repeat: 1 }, 0)
    .to(limbs.armLeft, { rotation: 0, duration: beat, ease: 'sine.inOut' }, beat)
    .to(limbs.armRight, { rotation: -angle, duration: beat, ease: 'sine.inOut' }, beat)
    .to(limbs.footRight, { rotation: -footAngle, duration: beat / 2, ease: 'power2.out', yoyo: true, repeat: 1 }, beat);
};

const buildHappy = (limbs: LimbTargets): gsap.core.Timeline => {
  const { raise, spread, jump, apex, jumps } = LIMB_MOTION.happy;
  const air                                  = jump * apex;

  // On every jump the arms go up and down celebrating, and the feet open a little in the air.
  return gsap
    .timeline({ repeat: jumps - 1 })
    .to(limbs.armLeft, { rotation: raise, duration: air, ease: 'power2.out' }, 0)
    .to(limbs.armRight, { rotation: -raise, duration: air, ease: 'power2.out' }, 0)
    .to(limbs.footLeft, { xPercent: -spread, duration: air, ease: 'power2.out' }, 0)
    .to(limbs.footRight, { xPercent: spread, duration: air, ease: 'power2.out' }, 0)
    .to([limbs.armLeft, limbs.armRight, limbs.footLeft, limbs.footRight], { rotation: 0, xPercent: 0, duration: jump - air, ease: 'power2.in' }, air);
};

const buildConfused = (limbs: LimbTargets): gsap.core.Timeline => {
  const { raise, scratch, up, beat } = LIMB_MOTION.confused;

  // One arm up by the side of the head, scratching.
  return gsap
    .timeline()
    .to(limbs.armRight, { rotation: raise, duration: up, ease: 'back.out(1.4)' })
    .to(limbs.armRight, { rotation: raise + scratch, duration: beat, ease: 'sine.inOut', yoyo: true, repeat: -1 });
};

const STATE_BUILDERS: Partial<Record<MascotStateType, (limbs: LimbTargets) => gsap.core.Timeline>> = {
  alert    : buildAlert,
  eating   : buildEating,
  working  : buildWorking,
  happy    : buildHappy,
  confused : buildConfused,
};

export const buildStateMotion = (state: MascotStateType, limbs: LimbTargets): gsap.core.Timeline | null =>
  STATE_BUILDERS[state]?.(limbs) ?? null;

interface WaveParams {
  limbs  : LimbTargets;
  config : typeof LIMB_MOTION.wave;
}

// arm-wave takes the place of arm-right, waves from its pivot and hands back.
const buildWave = ({ limbs, config }: WaveParams): gsap.core.Timeline => {
  const { angle, beat, times, swap } = config;
  const timeline                     = gsap.timeline();

  timeline.set(limbs.armRight, { autoAlpha: 0 }).set(limbs.armWave, { autoAlpha: 1, rotation: 0 });

  for (let index = 0; index < times; index += 1) {
    timeline.to(limbs.armWave, { rotation: -angle, duration: beat, ease: 'sine.inOut' }).to(limbs.armWave, { rotation: angle, duration: beat, ease: 'sine.inOut' });
  }

  return timeline
    .to(limbs.armWave, { rotation: 0, duration: swap, ease: 'sine.out' })
    .set(limbs.armWave, { autoAlpha: 0 })
    .set(limbs.armRight, { autoAlpha: 1 });
};

const buildPoint = (limbs: LimbTargets): gsap.core.Timeline => {
  const { angle, reach, hold, back } = LIMB_MOTION.point;

  // The right arm (the button's side) turns toward it and stays there a moment.
  return gsap
    .timeline()
    .to(limbs.armRight, { rotation: angle, duration: reach, ease: 'back.out(1.6)' })
    .to(limbs.armRight, { rotation: 0, duration: back, ease: 'power2.inOut' }, reach + hold);
};

const buildStretch = (limbs: LimbTargets): gsap.core.Timeline => {
  const { raise, scaleY, up, hold, down } = LIMB_MOTION.stretch;
  const timeline                          = gsap.timeline();

  timeline
    .to(limbs.armLeft, { rotation: raise, duration: up, ease: 'power2.out' }, 0)
    .to(limbs.armRight, { rotation: -raise, duration: up, ease: 'power2.out' }, 0)
    .to([limbs.armLeft, limbs.armRight], { rotation: 0, duration: down, ease: 'power2.inOut' }, up + hold);

  if (limbs.body) {
    timeline
      .to(limbs.body, { scaleY, transformOrigin: '50% 92%', duration: up, ease: 'power2.out' }, 0)
      .to(limbs.body, { scaleY: 1, duration: down, ease: 'power2.inOut', clearProps: 'transform' }, up + hold);
  }

  return timeline;
};

const buildTapDance = (limbs: LimbTargets): gsap.core.Timeline => {
  const { angle, beat, times } = LIMB_MOTION.tapDance;
  const timeline               = gsap.timeline();

  for (let index = 0; index < times; index += 1) {
    const left = index % 2 === 0;
    const foot = left ? limbs.footLeft : limbs.footRight;

    timeline.to(foot, { rotation: left ? angle : -angle, duration: beat, ease: 'power2.out', yoyo: true, repeat: 1 });
  }

  return timeline;
};

export const buildGesture = (gesture: MascotGesture, limbs: LimbTargets): gsap.core.Timeline => {
  if (gesture === 'wave') return buildWave({ limbs, config: LIMB_MOTION.wave });
  if (gesture === 'wave-once') return buildWave({ limbs, config: LIMB_MOTION.waveOnce });
  if (gesture === 'point') return buildPoint(limbs);
  if (gesture === 'stretch') return buildStretch(limbs);
  return buildTapDance(limbs);
};
