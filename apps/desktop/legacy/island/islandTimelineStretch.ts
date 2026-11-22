import gsap from 'gsap';
import { Flip } from 'gsap/Flip';
import { ISLAND_COLORS, ISLAND_SIZES } from '@/modules/island/constants/island';
import {
  CLOSE_MOTION,
  OPEN_MOTION,
  REDUCED_MOTION,
  REVEAL_FROM,
  REVEAL_OFFSET,
  REVEAL_STAGGER,
  REVEAL_TO,
} from '@/modules/island/constants/islandTimeline';
import type { IslandElements } from '@/modules/island/interfaces/islandElements';
import type { IslandTimelineParams } from '@/modules/island/interfaces/islandTimeline';
import type { VisibleIslandState } from '@/modules/island/types/islandState';
import { getThemeColor } from '@/modules/island/utils/themeColor';
import { REVEAL_ATTRIBUTE } from '@/shared/constants/reveal';
import type { RevealGroup } from '@/shared/types/revealGroup';

interface IslandTargets {
  panel        : HTMLDivElement;
  content      : HTMLDivElement;
  flyer        : HTMLDivElement;
  squash       : HTMLDivElement;
  pillAnchor   : HTMLDivElement;
  avatarAnchor : HTMLDivElement;
}

const REVEAL_GROUPS: RevealGroup[] = ['nav', 'heading', 'card'];

const resolveTargets = (elements: IslandElements): IslandTargets | null => {
  const { panel, content, flyer, squash, pillAnchor, avatarAnchor } = elements;

  if (!panel.current || !content.current || !flyer.current || !squash.current) return null;
  if (!pillAnchor.current || !avatarAnchor.current) return null;

  return {
    panel        : panel.current,
    content      : content.current,
    flyer        : flyer.current,
    squash       : squash.current,
    pillAnchor   : pillAnchor.current,
    avatarAnchor : avatarAnchor.current,
  };
};

const getWidthVars = (target: VisibleIslandState): gsap.TweenVars => ({
  width: ISLAND_SIZES[target].width,
});

const getHeightVars = (target: VisibleIslandState): gsap.TweenVars => {
  const { height, radius } = ISLAND_SIZES[target];

  return {
    height,
    borderBottomLeftRadius  : radius,
    borderBottomRightRadius : radius,
    backgroundColor         : getThemeColor(ISLAND_COLORS[target].background),
    borderColor             : getThemeColor(ISLAND_COLORS[target].border),
  };
};

const getPanelVars = (target: VisibleIslandState): gsap.TweenVars => ({
  ...getWidthVars(target),
  ...getHeightVars(target),
});

// Flip measures both boxes now and returns the transform that lands the flyer on the anchor.
const getFitVars = (flyer: HTMLElement, anchor: HTMLElement): gsap.TweenVars => {
  const vars = Flip.fit(flyer, anchor, { scale: true, getVars: true });

  return vars && !(vars instanceof gsap.core.Tween) ? (vars as gsap.TweenVars) : {};
};

const getRevealItems = (content: HTMLElement, group: RevealGroup): Element[] =>
  Array.from(content.querySelectorAll(`[${REVEAL_ATTRIBUTE}="${group}"]`));

const getAllRevealItems = (content: HTMLElement): Element[] =>
  REVEAL_GROUPS.flatMap((group) => getRevealItems(content, group));

const addReveal = (timeline: gsap.core.Timeline, content: HTMLElement, at: number) => {
  const { duration, ease } = OPEN_MOTION.reveal;

  timeline.to(content, { opacity: 1, ...OPEN_MOTION.content }, at);

  REVEAL_GROUPS.forEach((group) => {
    const items = getRevealItems(content, group);
    if (items.length === 0) return;

    timeline.fromTo(
      items,
      REVEAL_FROM[group],
      { ...REVEAL_TO, duration, ease, stagger: REVEAL_STAGGER[group] },
      at + REVEAL_OFFSET[group],
    );
  });
};

const buildOpenTimeline = (targets: IslandTargets): gsap.core.Timeline => {
  const { panel, content, flyer, squash, avatarAnchor } = targets;
  const { stretch, drop, flight, squash: landing } = OPEN_MOTION;

  const timeline  = gsap.timeline({ paused: true });
  const dropStart = stretch.duration * drop.startAt;
  const landed    = dropStart + flight.duration;

  timeline
    .to(panel, { ...getWidthVars('expanded'), duration: stretch.duration, ease: stretch.ease }, 0)
    .to(panel, { ...getHeightVars('expanded'), duration: drop.duration, ease: drop.ease }, dropStart)
    .to(flyer, { ...getFitVars(flyer, avatarAnchor), duration: flight.duration, ease: flight.ease }, dropStart)
    .to(squash, { scaleY: landing.scaleY, transformOrigin: landing.origin, duration: landing.impact, ease: 'power1.in' }, landed)
    .to(squash, { scaleY: 1, duration: landing.duration, ease: landing.ease }, landed + landing.impact);

  addReveal(timeline, content, landed * OPEN_MOTION.reveal.startAt);

  return timeline;
};

const buildCloseTimeline = (targets: IslandTargets): gsap.core.Timeline => {
  const { panel, content, flyer, squash, pillAnchor } = targets;
  const { content: fade, flight, lift, shrink } = CLOSE_MOTION;

  return gsap
    .timeline({ paused: true })
    .to(content, { opacity: 0, duration: fade.duration, ease: fade.ease }, 0)
    .to(squash, { scaleY: 1, duration: fade.duration }, 0)
    .to(flyer, { ...getFitVars(flyer, pillAnchor), duration: flight.duration, ease: flight.ease }, 0)
    .to(panel, { ...getHeightVars('collapsed'), duration: lift.duration, ease: lift.ease }, 0)
    .to(panel, { ...getWidthVars('collapsed'), duration: shrink.duration, ease: shrink.ease }, lift.duration);
};

// Reduced motion: a plain fade, no flight or bounce.
const buildReducedTimeline = (targets: IslandTargets, target: VisibleIslandState): gsap.core.Timeline => {
  const { panel, content, flyer, pillAnchor, avatarAnchor } = targets;
  const { duration, ease } = REDUCED_MOTION.fade;
  const timeline           = gsap.timeline({ paused: true });

  if (target === 'expanded') {
    const items = getAllRevealItems(content);

    timeline
      .set(panel, { ...getPanelVars('expanded'), opacity: 0 })
      .set(flyer, getFitVars(flyer, avatarAnchor))
      .set(content, { opacity: 1 });

    if (items.length > 0) timeline.set(items, REVEAL_TO);
    return timeline.to(panel, { opacity: 1, duration, ease });
  }

  return timeline
    .to(panel, { opacity: 0, duration, ease })
    .set(panel, getPanelVars('collapsed'))
    .set(flyer, getFitVars(flyer, pillAnchor))
    .set(content, { opacity: 0 })
    .set(panel, { opacity: 1 });
};

export const buildIslandTimeline = ({ elements, target, reduced }: IslandTimelineParams): gsap.core.Timeline | null => {
  const targets = resolveTargets(elements);
  if (!targets) return null;

  if (reduced) return buildReducedTimeline(targets, target);
  return target === 'expanded' ? buildOpenTimeline(targets) : buildCloseTimeline(targets);
};

// Snaps every piece to the pill, with no animation.
export const setCollapsedPose = (elements: IslandElements) => {
  const targets = resolveTargets(elements);
  if (!targets) return;

  gsap.set(targets.panel, { ...getPanelVars('collapsed'), opacity: 1 });
  gsap.set(targets.content, { opacity: 0 });
  gsap.set(targets.squash, { scaleY: 1 });
  gsap.set(targets.flyer, getFitVars(targets.flyer, targets.pillAnchor));
};
