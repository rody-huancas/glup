import gsap from 'gsap';
import { Flip } from 'gsap/Flip';
import { HOVER_GLOW, ISLAND_COLORS } from '@/modules/island/constants/island';
import type { IslandPlacement } from '@/modules/dock/interfaces/islandPlacement';
import { alongLength, dockShape, usesPeek } from '@/modules/dock/utils/placement';
import { MASCOT_MOTION } from '@/modules/island/constants/islandMascot';
import {
  CLOSE_MOTION,
  HOVER_MOTION,
  NOTICE_MOTION,
  OPEN_MOTION,
  REDUCED_MOTION,
  REVEAL_BLOCKS,
  REVEAL_FROM,
  REVEAL_TO,
} from '@/modules/island/constants/islandTimeline';
import type { IslandElements } from '@/modules/island/interfaces/islandElements';
import type { HoverTweenParams, IslandPoseParams, IslandTimelineParams, NoticeTimelineParams } from '@/modules/island/interfaces/islandTimeline';
import type { VisibleIslandState } from '@/modules/island/types/islandState';
import { addFlightFlourish } from '@/modules/island/utils/mascotFlight';
import { getOvershootEnd } from '@/modules/island/utils/overshoot';
import { getThemeColor } from '@/modules/island/utils/themeColor';
import { PEEK_VARIABLE } from '@/modules/mascot/constants/peek';
import { REVEAL_ATTRIBUTE } from '@/shared/constants/reveal';
import type { RevealGroup } from '@/shared/types/revealGroup';

interface IslandTargets {
  panel        : HTMLDivElement;
  fill         : SVGPathElement;
  glow         : SVGPathElement;
  content      : HTMLDivElement;
  lift         : HTMLDivElement;
  flyer        : HTMLDivElement;
  squash       : HTMLDivElement;
  pillAnchor   : HTMLDivElement;
  avatarAnchor : HTMLDivElement;
}

type BuildParams = Omit<IslandTimelineParams, 'elements' | 'target' | 'reduced'> & { targets: IslandTargets };

const resolveTargets = (elements: IslandElements): IslandTargets | null => {
  const { panel, fill, glow, content, lift, flyer, squash, pillAnchor, avatarAnchor } = elements;

  if (!panel.current || !fill.current || !glow.current || !content.current) return null;
  if (!lift.current || !flyer.current || !squash.current || !pillAnchor.current || !avatarAnchor.current) return null;

  return {
    panel        : panel.current,
    fill         : fill.current,
    glow         : glow.current,
    content      : content.current,
    lift         : lift.current,
    flyer        : flyer.current,
    squash       : squash.current,
    pillAnchor   : pillAnchor.current,
    avatarAnchor : avatarAnchor.current,
  };
};

// 1 where Glup peeks (the top pill and its notice), 0 where it is whole (the avatar, every other pill).
const peekVars = (placement: IslandPlacement, resting: boolean): gsap.TweenVars => ({ [PEEK_VARIABLE]: resting && usesPeek(placement) ? 1 : 0 });

// Fill color (the edge stays the same in every state).
const getFillVars = (target: VisibleIslandState): gsap.TweenVars => ({
  fill: getThemeColor(ISLAND_COLORS[target].background),
});


// Flip measures both boxes now and returns the transform that lands the flyer on the anchor.
const getFitVars = (flyer: HTMLElement, anchor: HTMLElement): gsap.TweenVars => {
  const vars = Flip.fit(flyer, anchor, { scale: true, getVars: true });

  return vars && !(vars instanceof gsap.core.Tween) ? (vars as gsap.TweenVars) : {};
};

// Cues only fire while playing forward; a reversed timeline leaves the face to the final calm.
const forwardOnly = (timeline: gsap.core.Timeline, cue: () => void) => () => {
  if (!timeline.reversed()) cue();
};

const getGroupItems = (content: HTMLElement, group: RevealGroup): Element[] =>
  Array.from(content.querySelectorAll(`[${REVEAL_ATTRIBUTE}="${group}"]`));

const getRevealItems = (content: HTMLElement): Element[] =>
  REVEAL_BLOCKS.flatMap((group) => getGroupItems(content, group));

// Widest change of the silhouette during the expansion, ears included (both sides of a corner).
const expansionChange = (placement: IslandPlacement): number => {
  const from = dockShape(placement, 'anticipation');
  const to   = dockShape(placement, 'expanded');

  if (placement.kind === 'corner' || placement.kind === 'bubble') return Math.max(to.width - from.width, to.height - from.height);
  return Math.max(alongLength(to) - alongLength(from), to.height - from.height);
};

const buildOpenTimeline = ({ targets, placement, shape, cues, onRender, onShapeSettled }: BuildParams): gsap.core.Timeline => {
  const { fill, glow, content, lift, flyer, squash, avatarAnchor } = targets;
  const { anticipation, expansion, colors, flight, squash: landing, content: fadeIn, reveal } = OPEN_MOTION;

  const timeline = gsap.timeline({ paused: true, onUpdate: onRender });
  const grow     = anticipation.duration;
  const landed   = grow + flight.duration;
  const hopAt    = landed + landing.impact + landing.duration;
  const revealAt = grow + reveal.startAt;
  const settleAt = grow + getOvershootEnd({ ease: expansion.ease, duration: expansion.duration, change: expansionChange(placement) });

  // The region can shrink to the panel once the elastic overshoot is over, unless playing backwards.
  const settleShape = () => {
    if (!timeline.reversed()) onShapeSettled();
  };

  timeline
    .call(forwardOnly(timeline, cues.excite), undefined, 0)
    .set(glow, { opacity: 0 }, 0)
    .to(shape, { ...dockShape(placement, 'anticipation'), duration: anticipation.duration, ease: anticipation.ease }, 0)
    .to(shape, { ...dockShape(placement, 'expanded'), duration: expansion.duration, ease: expansion.ease }, grow)
    .to(fill, { ...getFillVars('expanded'), duration: colors.duration, ease: colors.ease }, grow)
    .call(settleShape, undefined, settleAt)
    .to(flyer, { ...getFitVars(flyer, avatarAnchor), duration: flight.duration, ease: flight.ease }, grow)
    .fromTo(squash, peekVars(placement, true), { ...peekVars(placement, false), duration: flight.duration * MASCOT_MOTION.peek.share, ease: MASCOT_MOTION.peek.ease }, grow)
    .to(
      squash,
      { scaleX: landing.scaleX, scaleY: landing.scaleY, transformOrigin: landing.origin, duration: landing.impact, ease: 'power1.in' },
      landed,
    )
    .to(squash, { scaleX: 1, scaleY: 1, duration: landing.duration, ease: landing.ease }, landed + landing.impact)
    .to(content, { opacity: 1, y: 0, duration: fadeIn.duration, ease: fadeIn.ease }, revealAt)
    .call(forwardOnly(timeline, cues.celebrate), undefined, hopAt);

  addFlightFlourish({ timeline, lift, squash, at: grow, duration: flight.duration });

  REVEAL_BLOCKS.forEach((group, block) => {
    const items = getGroupItems(content, group);
    if (items.length === 0) return;

    timeline.fromTo(
      items,
      { ...REVEAL_FROM },
      { ...REVEAL_TO, duration: reveal.duration, ease: reveal.ease, stagger: reveal.itemStagger },
      revealAt + block * reveal.blockStagger,
    );
  });

  return timeline;
};

// Glup closes its eyes happily for an instant (farewell) before flying back to the pill.
// Closed on purpose, it also waves first, so the flight and the shrink wait for it.
const buildCloseTimeline = ({ targets, placement, shape, cues, farewell, onRender }: BuildParams): gsap.core.Timeline => {
  const { fill, content, lift, flyer, squash, pillAnchor } = targets;
  const { content: fadeOut, flight, shrink, settle } = CLOSE_MOTION;

  const collapsed = dockShape(placement, 'collapsed');
  const landing   = dockShape(placement, 'settle');
  const shrinkAt  = farewell ? shrink.startAt : shrink.leaveStartAt;
  const arrived   = shrinkAt + shrink.duration;
  const takeOff   = farewell ? MASCOT_MOTION.farewell.lead : MASCOT_MOTION.farewell.leaveLead;
  const timeline  = gsap.timeline({ paused: true, onUpdate: onRender });

  return timeline
    .call(forwardOnly(timeline, () => cues.farewell(farewell)), undefined, 0)
    .to(lift, { y: 0, duration: fadeOut.duration }, 0)
    .to(squash, { rotation: 0, duration: fadeOut.duration }, 0)
    .to(content, { opacity: 0, y: fadeOut.y, duration: fadeOut.duration, ease: fadeOut.ease }, 0)
    .to(squash, { scaleX: 1, scaleY: 1, duration: fadeOut.duration }, 0)
    .to(flyer, { ...getFitVars(flyer, pillAnchor), duration: flight.duration, ease: flight.ease }, takeOff)
    .to(squash, { ...peekVars(placement, true), duration: flight.duration * MASCOT_MOTION.peek.share, ease: MASCOT_MOTION.peek.ease }, takeOff + flight.duration * (1 - MASCOT_MOTION.peek.share))
    .to(shape, { ...collapsed, duration: shrink.duration, ease: shrink.ease }, shrinkAt)
    .to(fill, { ...getFillVars('collapsed'), duration: shrink.duration, ease: shrink.ease }, shrinkAt)
    .to(shape, { width: landing.width, height: landing.height, duration: settle.impact, ease: 'power1.out' }, arrived)
    .to(
      shape,
      { width: collapsed.width, height: collapsed.height, duration: settle.duration - settle.impact, ease: settle.ease },
      arrived + settle.impact,
    );
};

// Reduced motion: a plain fade, the shape jumps straight to its final form.
// Faces still change; there is no flight, arc or hop.
const buildReducedTimeline = ({ targets, placement, shape, cues, farewell, onRender }: BuildParams, target: VisibleIslandState): gsap.core.Timeline => {
  const { panel, fill, glow, content, flyer, squash, pillAnchor, avatarAnchor } = targets;
  const { duration, ease } = REDUCED_MOTION.fade;
  const timeline           = gsap.timeline({ paused: true, onUpdate: onRender });

  if (target === 'expanded') {
    const items = getRevealItems(content);

    timeline
      .call(forwardOnly(timeline, cues.excite))
      .set(glow, { opacity: 0 })
      .set(panel, { opacity: 0 })
      .set(shape, { ...dockShape(placement, 'expanded') })
      .set(fill, getFillVars('expanded'))
      .set(flyer, getFitVars(flyer, avatarAnchor))
      .set(squash, peekVars(placement, false))
      .set(content, { opacity: 1, y: 0 });

    if (items.length > 0) timeline.set(items, { ...REVEAL_TO });
    return timeline.to(panel, { opacity: 1, duration, ease }).call(forwardOnly(timeline, cues.celebrate));
  }

  return timeline
    .call(forwardOnly(timeline, () => cues.farewell(farewell)))
    .to(panel, { opacity: 0, duration, ease })
    .set(shape, { ...dockShape(placement, 'collapsed') })
    .set(fill, getFillVars('collapsed'))
    .set(flyer, getFitVars(flyer, pillAnchor))
    .set(squash, peekVars(placement, true))
    .set(content, { opacity: 0 })
    .set(panel, { opacity: 1 });
};

export const buildIslandTimeline = ({ elements, target, reduced, ...rest }: IslandTimelineParams): gsap.core.Timeline | null => {
  const targets = resolveTargets(elements);
  if (!targets) return null;

  const params: BuildParams = { ...rest, targets };

  if (reduced) return buildReducedTimeline(params, target);
  return target === 'expanded' ? buildOpenTimeline(params) : buildCloseTimeline(params);
};

// The pill breathes in while the cursor waits over it, and springs back if it leaves.
export const buildHoverTween = ({ placement, shape, inflated, onRender }: HoverTweenParams): gsap.core.Tween => {
  const size   = dockShape(placement, inflated ? 'hover' : 'collapsed');
  const motion = inflated ? HOVER_MOTION.inflate : HOVER_MOTION.deflate;

  return gsap.to(shape, {
    width    : size.width,
    height   : size.height,
    duration : motion.duration,
    ease     : motion.ease,
    onUpdate : onRender,
  });
};

// Snaps every piece to the pill, with no animation.
export const setCollapsedPose = ({ elements, placement, shape, onRender }: IslandPoseParams) => {
  const targets = resolveTargets(elements);
  if (!targets) return;

  Object.assign(shape, dockShape(placement, 'collapsed'));
  onRender();

  gsap.set(targets.panel, { opacity: 1 });
  gsap.set(targets.glow, { opacity: 0 });
  gsap.set(targets.fill, getFillVars('collapsed'));
  gsap.set(targets.content, { opacity: 0, y: 0 });
  gsap.set(targets.lift, { y: 0 });
  gsap.set(targets.squash, { scaleX: 1, scaleY: 1, rotation: 0, ...peekVars(placement, true) });
  gsap.set(targets.flyer, getFitVars(targets.flyer, targets.pillAnchor));
};

// The open panel at once, for an island moved while open (Ajustes › Posición de Glup).
export const setExpandedPose = ({ elements, placement, shape, onRender }: IslandPoseParams) => {
  const targets = resolveTargets(elements);
  if (!targets) return;

  Object.assign(shape, dockShape(placement, 'expanded'));
  onRender();

  gsap.set(targets.panel, { opacity: 1 });
  gsap.set(targets.glow, { opacity: 0 });
  gsap.set(targets.fill, getFillVars('expanded'));
  gsap.set(targets.content, { opacity: 1, y: 0 });
  gsap.set(targets.lift, { y: 0 });
  gsap.set(targets.squash, { scaleX: 1, scaleY: 1, rotation: 0, ...peekVars(placement, false) });
  gsap.set(targets.flyer, getFitVars(targets.flyer, targets.avatarAnchor));
};

// Live notice: the pill grows (same elastic as the panel), Glup moves to its left end and the result shows.
// Reversing it brings everything back to the pill. With reduced motion the wide pill and Glup's place are
// set at once and only the text fades: the same notice, for the same time, with the same buttons.
export const buildNoticeTimeline = ({ elements, placement, shape, style, onRender }: NoticeTimelineParams): gsap.core.Timeline | null => {
  const [flyer, anchor, text] = [elements.flyer.current, elements.noticeAnchor.current, elements.noticeText.current];
  if (!flyer || !anchor || !text) return null;

  const { grow, flight, text: reveal } = NOTICE_MOTION;
  const notice                         = dockShape(placement, 'notice');

  if (style === 'fade') {
    const { duration, ease } = REDUCED_MOTION.fade;

    return gsap
      .timeline({ paused: true, onUpdate: onRender })
      .set(shape, { ...notice }, 0)
      .set(flyer, getFitVars(flyer, anchor), 0)
      .fromTo(text, { opacity: 0, x: 0 }, { opacity: 1, x: 0, duration, ease }, 0);
  }

  return gsap
    .timeline({ paused: true, onUpdate: onRender })
    .to(shape, { ...notice, duration: grow.duration, ease: grow.ease }, 0)
    .to(flyer, { ...getFitVars(flyer, anchor), duration: flight.duration, ease: flight.ease }, 0)
    .fromTo(text, { opacity: 0, x: -6 }, { opacity: 1, x: 0, duration: reveal.duration, ease: reveal.ease }, reveal.delay);
};

interface GlowParams {
  elements : IslandElements;
  on       : boolean;
  reduced  : boolean;
}

// The mint glow of the resting pill under the cursor: soft in and out, or at once with reduced motion.
export const setHoverGlow = ({ elements, on, reduced }: GlowParams) => {
  const glow = elements.glow.current;
  if (!glow) return;
  gsap.to(glow, { opacity: on ? HOVER_GLOW.opacity : 0, duration: reduced ? 0 : HOVER_GLOW.duration, ease: HOVER_GLOW.ease, overwrite: true });
};

// Off at once and for good (an opening, or the panel settled open): no hover fade can bring it back.
export const hideHoverGlow = (elements: IslandElements) => {
  const glow = elements.glow.current;
  if (!glow) return;
  gsap.killTweensOf(glow);
  gsap.set(glow, { opacity: 0 });
};
