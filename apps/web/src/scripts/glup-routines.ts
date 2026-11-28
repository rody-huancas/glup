// The little routines the hero's Glup (art/glup-art.astro) plays while it rests, each one a GSAP timeline
// of 1.5–4 s that ends with Glup back in its place: waving, a short walk, taking its headphones off to
// listen, a dance with notes, a stretch with a yawn, a look at the files with a lick and eating one.
// hero-mascot.ts picks them (lib/glup-routine-picker.ts) and stops them when someone comes over.
import { gsap } from 'gsap';
import type { RoutineName } from '@/lib/glup-routine-picker';

type Mouth = 'smile' | 'open' | 'yawn';

export interface IGlupParts {
  stage   : HTMLElement;
  holder  : HTMLElement;
  figure  : SVGSVGElement;
  eyes    : Element[];
  leaf    : Element;
  cheeks  : Element;
  mouths  : Record<Mouth, Element>;
  tongue  : Element;
  arms    : { left: Element; right: Element; layer: Element };
  feet    : Element[];
  phones  : Element[];
  notes   : Element[];
  snacks  : HTMLElement[];
  bubble  : Element | null;
}

export const FROM_BOTTOM = '50% 100%';

// Where each arm turns: its shoulder, inside the body (in the drawing's units). The arm's base goes deep
// into the body (art/glup-art.astro), so turning from here its root always stays behind the body's outline.
const SHOULDER = { right: '505 428', left: '151 428' } as const;

// An arm raised is the same arm turned up and out from the shoulder, up to 1.3 times longer (never
// thinner), a little lower on the body's side so it clears the headphone's cup; the shift only moves it
// along or into the body, never out. Angle and twist (the hand turning) in degrees, shift in drawing units,
// for the right arm (the left one mirrors it). Only to hold the headphones do the hands go over the cups.
interface IArmPose {
  angle  : number;
  length : number;
  twist  : number;
  x      : number;
  y      : number;
}

const ARM_POSES = {
  rest    : { angle: 0, length: 1, twist: 0, x: 0, y: 0 },
  wave    : { angle: 26, length: 1.3, twist: 0, x: 0, y: 40 },
  waveTop : { angle: 34, length: 1.3, twist: 3, x: 0, y: 40 },
  waveLow : { angle: 16, length: 1.3, twist: -3, x: 0, y: 40 },
  stretch : { angle: 34, length: 1.3, twist: 0, x: 0, y: 40 },
  hold    : { angle: 70, length: 1, twist: 0, x: 0, y: -70 },
  lift    : { angle: 80, length: 1, twist: 0, x: 0, y: -110 },
} as const satisfies Record<string, IArmPose>;

// How far the eyes go in the drawing's units (as when they follow the cursor), and the walk's reach as a
// share of the hero's drawing area (never past its left edge: the text is beyond it).
const EYE_REACH  = 14;
const WALK_SHARE = 0.16;

// A step's length in seconds, and how many there are each way.
const STEP  = 0.32;
const STEPS = 4;

export const findParts = (holder: HTMLElement): IGlupParts | null => {
  const stage     = holder.parentElement;
  const figure    = holder.querySelector<SVGSVGElement>('[data-glup-art]');
  const pick      = (selector: string): Element | null => figure?.querySelector(selector) ?? null;
  const leaf      = pick('[data-glup-leaf]');
  const cheeks    = pick('[data-glup-cheeks]');
  const smile     = pick('[data-glup-mouth="smile"]');
  const open      = pick('[data-glup-mouth="open"]');
  const yawn      = pick('[data-glup-mouth="yawn"]');
  const tongue    = pick('[data-glup-tongue]');
  const left      = pick('[data-glup-arm="left"]');
  const right     = pick('[data-glup-arm="right"]');
  const layer     = pick('[data-glup-arms]');
  if (!stage || !figure || !leaf || !cheeks || !smile || !open || !yawn || !tongue || !left || !right || !layer) return null;

  return {
    stage,
    holder,
    figure,
    leaf,
    cheeks,
    tongue,
    eyes   : gsap.utils.toArray<Element>('[data-glup-eye]', figure),
    mouths : { smile, open, yawn },
    arms   : { left, right, layer },
    feet   : gsap.utils.toArray<Element>('[data-glup-foot]', figure),
    phones : gsap.utils.toArray<Element>('[data-glup-phones]', figure),
    notes  : gsap.utils.toArray<Element>('[data-glup-note]', figure),
    snacks : gsap.utils.toArray<HTMLElement>('[data-snack]'),
    bubble : document.querySelector('[data-hero-bubble]'),
  };
};

// Where each piece of the drawing turns and grows, set once: GSAP keeps an SVG piece in place when its
// origin changes (it adds a shift), so a tween that changed it would leave the piece out of its place.
export const prepareParts = ({ eyes, leaf, cheeks, mouths, tongue, arms, feet }: IGlupParts): void => {
  gsap.set(arms.right, { svgOrigin: SHOULDER.right });
  gsap.set(arms.left, { svgOrigin: SHOULDER.left });
  gsap.set(eyes, { transformOrigin: '50% 60%' });
  gsap.set(leaf, { transformOrigin: '30% 95%' });
  gsap.set(cheeks, { transformOrigin: '50% 50%' });
  gsap.set(mouths.yawn, { transformOrigin: '50% 30%' });
  gsap.set(tongue, { transformOrigin: '50% 0%' });
  gsap.set(feet, { transformOrigin: FROM_BOTTOM });
};

const centre = (element: Element): { x: number; y: number } => {
  const box = element.getBoundingClientRect();
  return { x: box.left + box.width / 2, y: box.top + box.height / 2 };
};

// The floating files on screen, closest first to a point.
const closestSnacks = (snacks: HTMLElement[], point: { x: number; y: number }): HTMLElement[] =>
  snacks
    .filter((snack) => snack.offsetParent !== null)
    .map((snack) => ({ snack, at: centre(snack) }))
    .sort((a, b) => Math.hypot(a.at.x - point.x, a.at.y - point.y) - Math.hypot(b.at.x - point.x, b.at.y - point.y))
    .map(({ snack }) => snack);

export const showMouth = (mouths: IGlupParts['mouths'], shown: Mouth): gsap.core.Timeline => {
  const timeline = gsap.timeline();
  (Object.keys(mouths) as Mouth[]).forEach((mouth) => {
    timeline.to(mouths[mouth], { opacity: mouth === shown ? 1 : 0, duration: 0.12 }, 0);
  });
  return timeline;
};

type Side = 'left' | 'right';

const armTo = (arm: Element, side: Side, pose: IArmPose, vars: gsap.TweenVars): gsap.core.Tween => {
  const mirror = side === 'right' ? 1 : -1;
  return gsap.to(arm, { rotation: -pose.angle * mirror, scaleX: pose.length, skewY: -pose.twist * mirror, x: pose.x * mirror, y: pose.y, ...vars });
};

// The arms are drawn behind the body; only to hold the headphones do they go over them (just after the
// right cup in the drawing), and back.
export const placeArms = ({ arms, phones }: IGlupParts, over: boolean): void => {
  const band     = phones[0];
  const lastCup  = phones[phones.length - 1];
  const parent   = arms.layer.parentNode;
  if (!parent || !band || !lastCup) return;
  parent.insertBefore(arms.layer, over ? lastCup.nextSibling : band);
};

const armsTo = ({ arms }: IGlupParts, pose: IArmPose, vars: gsap.TweenVars): gsap.core.Timeline => gsap.timeline()
  .add(armTo(arms.right, 'right', pose, vars), 0)
  .add(armTo(arms.left, 'left', pose, vars), 0);

// The right arm goes up and out, rocks there with the hand turning a little, then comes down (also the
// «Saludar a Glup» wave).
export const waving = ({ arms }: IGlupParts, swings: number): gsap.core.Timeline => {
  const timeline = gsap.timeline().add(armTo(arms.right, 'right', ARM_POSES.wave, { duration: 0.35, ease: 'back.out(1.6)' }));
  for (let swing = 0; swing < swings; swing += 1) {
    timeline
      .add(armTo(arms.right, 'right', ARM_POSES.waveTop, { duration: 0.26, ease: 'sine.inOut' }))
      .add(armTo(arms.right, 'right', ARM_POSES.waveLow, { duration: 0.3, ease: 'sine.inOut' }));
  }
  timeline.add(armTo(arms.right, 'right', ARM_POSES.wave, { duration: 0.2, ease: 'sine.inOut' }));
  return timeline.add(armTo(arms.right, 'right', ARM_POSES.rest, { duration: 0.3, ease: 'power1.inOut' }));
};

// Steps: the feet lift one after the other while the body rocks from side to side.
const steps = ({ holder, feet }: IGlupParts, count: number): gsap.core.Timeline => {
  const timeline = gsap.timeline();
  for (let step = 0; step < count; step += 1) {
    const side = step % 2 === 0 ? 1 : -1;
    timeline
      .to(feet[step % feet.length], { y: -12, rotation: 6 * side, duration: STEP / 2, ease: 'sine.out' }, step * STEP)
      .to(feet[step % feet.length], { y: 0, rotation: 0, duration: STEP / 2, ease: 'sine.in' })
      .to(holder, { rotation: 3 * side, duration: STEP, ease: 'sine.inOut', transformOrigin: FROM_BOTTOM }, step * STEP);
  }
  return timeline.to(holder, { rotation: 0, duration: 0.2, ease: 'sine.out' });
};

// 1. It raises an arm and waves it from side to side.
const wave = (parts: IGlupParts): gsap.core.Timeline => {
  const { holder, cheeks } = parts;
  return gsap.timeline()
    .add(waving(parts, 3))
    .to(holder, { rotation: -3, duration: 0.6, ease: 'sine.inOut', yoyo: true, repeat: 1, transformOrigin: FROM_BOTTOM }, 0)
    .to(cheeks, { scale: 1.1, duration: 0.3, yoyo: true, repeat: 1, repeatDelay: 1.2 }, 0);
};

// 2. A few steps to the left (where there is room), a look back and the steps home.
const walk = (parts: IGlupParts): gsap.core.Timeline => {
  const { stage, holder, eyes } = parts;
  const room  = Math.min(stage.clientWidth * WALK_SHARE, holder.offsetLeft);
  const going = STEP * STEPS + 0.2;
  const back  = going + 0.9;

  return gsap.timeline()
    .to(eyes, { x: -10, duration: 0.3, ease: 'power2.out' }, 0)
    .to(holder, { x: -room, duration: going, ease: 'sine.inOut' }, 0)
    .add(steps(parts, STEPS), 0)
    .to(eyes, { x: 12, duration: 0.35, ease: 'power2.out' }, going + 0.2)
    .to(holder, { x: 0, duration: going, ease: 'sine.inOut' }, back)
    .add(steps(parts, STEPS), back)
    .to(eyes, { x: 0, duration: 0.3, ease: 'power2.out' }, back + going - 0.3);
};

// 3. It lifts its headphones off with both arms, lets them float above, tilts its head as if listening
// and puts them back on.
const headphones = (parts: IGlupParts): gsap.core.Timeline => {
  const { holder, eyes, phones } = parts;
  return gsap.timeline()
    .call(() => placeArms(parts, true))
    .add(armsTo(parts, ARM_POSES.hold, { duration: 0.45, ease: 'back.out(1.4)' }))
    .add(armsTo(parts, ARM_POSES.lift, { duration: 0.45, ease: 'power2.out' }))
    .to(phones, { y: -50, duration: 0.45, ease: 'power2.out' }, '<')
    .add(armsTo(parts, ARM_POSES.rest, { duration: 0.4, ease: 'power1.inOut' }))
    .to(phones, { y: -140, duration: 0.7, ease: 'sine.out' }, '<')
    .to(holder, { rotation: -6, duration: 0.45, ease: 'sine.inOut', transformOrigin: FROM_BOTTOM })
    .to(eyes, { x: -6, y: -6, duration: 0.3, ease: 'power2.out' }, '<')
    .to(holder, { rotation: 6, duration: 0.6, ease: 'sine.inOut' })
    .to(eyes, { x: 6, duration: 0.4, ease: 'power2.out' }, '<')
    .to(holder, { rotation: 0, duration: 0.45, ease: 'sine.inOut' })
    .to(eyes, { x: 0, y: 0, duration: 0.3, ease: 'power2.out' }, '<')
    .to(phones, { y: -50, duration: 0.5, ease: 'sine.inOut' }, '<')
    .add(armsTo(parts, ARM_POSES.lift, { duration: 0.45, ease: 'power2.out' }), '<')
    .add(armsTo(parts, ARM_POSES.hold, { duration: 0.45, ease: 'power2.inOut' }))
    .to(phones, { y: 0, duration: 0.45, ease: 'power2.inOut' }, '<')
    .add(armsTo(parts, ARM_POSES.rest, { duration: 0.4, ease: 'power1.inOut' }))
    .call(() => placeArms(parts, false));
};

// 4. It nods to the beat with its headphones on, and two or three notes come out and fade.
const dance = (parts: IGlupParts): gsap.core.Timeline => {
  const { holder, cheeks, notes } = parts;
  const beat     = 0.24;
  const timeline = gsap.timeline({ defaults: { ease: 'sine.inOut' } });

  for (let count = 0; count < 6; count += 1) {
    timeline
      .to(holder, { rotation: count % 2 === 0 ? 4 : -4, y: -7, duration: beat, transformOrigin: FROM_BOTTOM })
      .to(holder, { y: 0, duration: beat });
  }
  timeline.to(holder, { rotation: 0, duration: 0.25 });
  timeline.to(cheeks, { scale: 1.1, duration: 0.3, yoyo: true, repeat: 1, repeatDelay: 2 }, 0);

  notes.forEach((note, index) => {
    const start = 0.2 + index * 0.7;
    timeline
      .fromTo(note, { opacity: 0, x: 0, y: 0, rotation: -10 }, { opacity: 1, duration: 0.25, ease: 'sine.out' }, start)
      .to(note, { x: index % 2 === 0 ? 14 : -10, y: -64, rotation: 12, duration: 1.4, ease: 'sine.out' }, start)
      .to(note, { opacity: 0, duration: 0.5 }, start + 0.9)
      .set(note, { x: 0, y: 0, rotation: 0 });
  });

  return timeline;
};

// 5. It stretches up with its arms high, closes its eyes and yawns.
const stretch = (parts: IGlupParts): gsap.core.Timeline => {
  const { holder, eyes, mouths } = parts;
  return gsap.timeline()
    .add(armsTo(parts, ARM_POSES.stretch, { duration: 0.5, ease: 'back.out(1.4)' }), 0)
    .to(holder, { scaleY: 1.08, scaleX: 0.95, duration: 0.8, ease: 'sine.inOut', transformOrigin: FROM_BOTTOM }, 0)
    .to(eyes, { scaleY: 0.1, duration: 0.25, ease: 'power1.inOut' }, 0.35)
    .add(showMouth(mouths, 'yawn'), 0.45)
    .fromTo(mouths.yawn, { scale: 0.5 }, { scale: 1.1, duration: 0.7, ease: 'sine.out' }, 0.45)
    .to(holder, { scaleY: 1, scaleX: 1, duration: 0.7, ease: 'sine.inOut' }, 1.9)
    .add(armsTo(parts, ARM_POSES.rest, { duration: 0.45, ease: 'power1.inOut' }), 1.9)
    .add(showMouth(mouths, 'smile'), 1.9)
    .set(mouths.yawn, { scale: 1 })
    .to(eyes, { scaleY: 1, duration: 0.25, ease: 'power1.inOut' }, 2.2);
};

// 6. It looks at the closest floating file and licks its lips.
const lick = (parts: IGlupParts): gsap.core.Timeline => {
  const { figure, eyes, cheeks, tongue, snacks } = parts;
  const box      = figure.getBoundingClientRect();
  const from     = { x: box.left + box.width * 0.53, y: box.top + box.height * 0.47 };
  const target   = closestSnacks(snacks, from)[0];
  const to       = target ? centre(target) : { x: from.x - 1, y: from.y };
  const distance = Math.hypot(to.x - from.x, to.y - from.y) || 1;

  return gsap.timeline()
    .to(eyes, { x: ((to.x - from.x) / distance) * EYE_REACH, y: ((to.y - from.y) / distance) * EYE_REACH * 0.8, duration: 0.4, ease: 'power2.out' })
    .to(cheeks, { scale: 1.1, duration: 0.3, ease: 'back.out(2)' }, '<')
    .set(tongue, { opacity: 1 }, '+=0.45')
    .fromTo(tongue, { scale: 0.2 }, { scale: 1, duration: 0.2, ease: 'back.out(2)' })
    .to(tongue, { x: -14, duration: 0.22, ease: 'sine.inOut', yoyo: true, repeat: 3 })
    .to(tongue, { scale: 0.2, duration: 0.15, ease: 'power1.in' })
    .set(tongue, { opacity: 0, x: 0, scale: 1 })
    .to(eyes, { x: 0, y: 0, duration: 0.4, ease: 'power2.out' }, '+=0.2')
    .to(cheeks, { scale: 1, duration: 0.3, ease: 'sine.out' }, '<');
};

// 7. The floating file closest to its mouth flies in; Glup squashes, «ñam», and the file comes back.
const eat = (parts: IGlupParts): gsap.core.Timeline => {
  const { holder, mouths, snacks, bubble } = parts;
  const mouth  = centre(mouths.open);
  const target = closestSnacks(snacks, mouth)[0];
  if (!target) return gsap.timeline();

  const from = centre(target);
  return gsap.timeline()
    .add(showMouth(mouths, 'open'))
    .to(target, { x: mouth.x - from.x, y: mouth.y - from.y, scale: 0.15, rotation: 30, duration: 0.7, ease: 'power2.in' }, '<')
    .set(target, { opacity: 0 })
    .add(showMouth(mouths, 'smile'))
    .to(holder, { scaleY: 0.9, scaleX: 1.07, duration: 0.12, ease: 'power1.out', transformOrigin: FROM_BOTTOM }, '<')
    .to(holder, { scaleY: 1, scaleX: 1, duration: 0.7, ease: 'elastic.out(1, 0.4)', transformOrigin: FROM_BOTTOM })
    .fromTo(bubble, { scale: 0.6 }, { scale: 1, duration: 0.5, ease: 'back.out(3)', transformOrigin: '30% 100%' }, '<')
    .set(target, { x: 0, y: 0, rotation: 0, scale: 0, opacity: 1 }, '+=1.4')
    .to(target, { scale: 1, duration: 0.5, ease: 'back.out(2)' });
};

export const ROUTINE_PLAYERS: Record<RoutineName, (parts: IGlupParts) => gsap.core.Timeline> = {
  wave,
  walk,
  headphones,
  dance,
  stretch,
  lick,
  eat,
};

// Back to rest from wherever a routine was cut, softly: someone came over and Glup turns to them.
export const settle = (parts: IGlupParts): gsap.core.Timeline => {
  const { holder, eyes, cheeks, mouths, tongue, arms, feet, phones, notes, snacks } = parts;
  placeArms(parts, false);
  return gsap.timeline({ defaults: { duration: 0.35, ease: 'sine.out' } })
    .to(holder, { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 }, 0)
    .to(eyes, { x: 0, y: 0, scaleY: 1 }, 0)
    .to(feet, { y: 0, rotation: 0 }, 0)
    .to(phones, { y: 0 }, 0)
    .to(notes, { opacity: 0 }, 0)
    .to([arms.left, arms.right], { rotation: 0, scaleX: 1, skewY: 0, x: 0, y: 0 }, 0)
    .to(tongue, { opacity: 0, x: 0, scale: 1 }, 0)
    .to(cheeks, { scale: 1 }, 0)
    .to(mouths.yawn, { scale: 1 }, 0)
    .add(showMouth(mouths, 'smile'), 0)
    .to(snacks, { x: 0, y: 0, rotation: 0, scale: 1, opacity: 1 }, 0)
    .set(notes, { x: 0, y: 0, rotation: 0 });
};
