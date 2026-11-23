import gsap from 'gsap';
import { Flip } from 'gsap/Flip';
import { ISLAND_COLORS } from '@/modules/island/constants/island';
import { MASCOT_MOTION } from '@/modules/island/constants/islandMascot';
import { ANTICIPATION_SHAPE, HOVER_SHAPE, ISLAND_SHAPES, NOTICE_SHAPE, SETTLE_SHAPE } from '@/modules/island/constants/islandShape';
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
import type { HoverTweenParams, IslandPoseParams, IslandTimelineParams } from '@/modules/island/interfaces/islandTimeline';
import type { VisibleIslandState } from '@/modules/island/types/islandState';
import { addFlightFlourish } from '@/modules/island/utils/mascotFlight';
import { getOvershootEnd } from '@/modules/island/utils/overshoot';
import { getThemeColor } from '@/modules/island/utils/themeColor';
import { REVEAL_ATTRIBUTE } from '@/shared/constants/reveal';
import type { RevealGroup } from '@/shared/types/revealGroup';

interface IslandTargets {
  panel        : HTMLDivElement;
  fill         : SVGPathElement;
  outline      : SVGPathElement;
  content      : HTMLDivElement;
  lift         : HTMLDivElement;
  flyer        : HTMLDivElement;
  squash       : HTMLDivElement;
  pillAnchor   : HTMLDivElement;
  avatarAnchor : HTMLDivElement;
}

type BuildParams = Omit<IslandTimelineParams, 'elements' | 'target' | 'reduced'> & { targets: IslandTargets };

const resolveTargets = (elements: IslandElements): IslandTargets | null => {
  const { panel, fill, outline, content, lift, flyer, squash, pillAnchor, avatarAnchor } = elements;

  if (!panel.current || !fill.current || !outline.current || !content.current) return null;
  if (!lift.current || !flyer.current || !squash.current || !pillAnchor.current || !avatarAnchor.current) return null;

  return {
    panel        : panel.current,
    fill         : fill.current,
    outline      : outline.current,
    content      : content.current,
    lift         : lift.current,
    flyer        : flyer.current,
    squash       : squash.current,
    pillAnchor   : pillAnchor.current,
    avatarAnchor : avatarAnchor.current,
  };
};

// Fill color, plus the border, which only shows on the expanded panel.
const getFillVars = (target: VisibleIslandState): gsap.TweenVars => ({
  fill: getThemeColor(ISLAND_COLORS[target].background),
});

const getOutlineVars = (target: VisibleIslandState): gsap.TweenVars => ({
  stroke        : getThemeColor(ISLAND_COLORS.expanded.border),
  strokeOpacity : target === 'expanded' ? 1 : 0,
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

// Widest change of the silhouette during the expansion, ears included.
const EXPANSION_CHANGE =
  ISLAND_SHAPES.expanded.width + ISLAND_SHAPES.expanded.earRadius * 2
  - (ANTICIPATION_SHAPE.width + ISLAND_SHAPES.collapsed.earRadius * 2);

const buildOpenTimeline = ({ targets, shape, cues, onRender, onShapeSettled }: BuildParams): gsap.core.Timeline => {
  const { fill, outline, content, lift, flyer, squash, avatarAnchor } = targets;
  const { anticipation, expansion, colors, flight, squash: landing, content: fadeIn, reveal } = OPEN_MOTION;

  const timeline = gsap.timeline({ paused: true, onUpdate: onRender });
  const grow     = anticipation.duration;
  const landed   = grow + flight.duration;
  const hopAt    = landed + landing.impact + landing.duration;
  const revealAt = grow + reveal.startAt;
  const settleAt = grow + getOvershootEnd({ ease: expansion.ease, duration: expansion.duration, change: EXPANSION_CHANGE });

  // The region can shrink to the panel once the elastic overshoot is over, unless playing backwards.
  const settleShape = () => {
    if (!timeline.reversed()) onShapeSettled();
  };

  timeline
    .call(forwardOnly(timeline, cues.excite), undefined, 0)
    .to(shape, { ...ANTICIPATION_SHAPE, duration: anticipation.duration, ease: anticipation.ease }, 0)
    .to(shape, { ...ISLAND_SHAPES.expanded, duration: expansion.duration, ease: expansion.ease }, grow)
    .to(fill, { ...getFillVars('expanded'), duration: colors.duration, ease: colors.ease }, grow)
    .to(outline, { ...getOutlineVars('expanded'), duration: colors.duration, ease: colors.ease }, grow)
    .call(settleShape, undefined, settleAt)
    .to(flyer, { ...getFitVars(flyer, avatarAnchor), duration: flight.duration, ease: flight.ease }, grow)
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
const buildCloseTimeline = ({ targets, shape, cues, farewell, onRender }: BuildParams): gsap.core.Timeline => {
  const { fill, outline, content, lift, flyer, squash, pillAnchor } = targets;
  const { content: fadeOut, flight, shrink, settle } = CLOSE_MOTION;

  const collapsed = ISLAND_SHAPES.collapsed;
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
    .to(shape, { ...collapsed, duration: shrink.duration, ease: shrink.ease }, shrinkAt)
    .to(fill, { ...getFillVars('collapsed'), duration: shrink.duration, ease: shrink.ease }, shrinkAt)
    .to(outline, { ...getOutlineVars('collapsed'), duration: shrink.duration, ease: shrink.ease }, shrinkAt)
    .to(shape, { ...SETTLE_SHAPE, duration: settle.impact, ease: 'power1.out' }, arrived)
    .to(
      shape,
      { width: collapsed.width, height: collapsed.height, duration: settle.duration - settle.impact, ease: settle.ease },
      arrived + settle.impact,
    );
};

// Reduced motion: a plain fade, the shape jumps straight to its final form.
// Faces still change; there is no flight, arc or hop.
const buildReducedTimeline = ({ targets, shape, cues, farewell, onRender }: BuildParams, target: VisibleIslandState): gsap.core.Timeline => {
  const { panel, fill, outline, content, flyer, pillAnchor, avatarAnchor } = targets;
  const { duration, ease } = REDUCED_MOTION.fade;
  const timeline           = gsap.timeline({ paused: true, onUpdate: onRender });

  if (target === 'expanded') {
    const items = getRevealItems(content);

    timeline
      .call(forwardOnly(timeline, cues.excite))
      .set(panel, { opacity: 0 })
      .set(shape, { ...ISLAND_SHAPES.expanded })
      .set(fill, getFillVars('expanded'))
      .set(outline, getOutlineVars('expanded'))
      .set(flyer, getFitVars(flyer, avatarAnchor))
      .set(content, { opacity: 1, y: 0 });

    if (items.length > 0) timeline.set(items, { ...REVEAL_TO });
    return timeline.to(panel, { opacity: 1, duration, ease }).call(forwardOnly(timeline, cues.celebrate));
  }

  return timeline
    .call(forwardOnly(timeline, () => cues.farewell(farewell)))
    .to(panel, { opacity: 0, duration, ease })
    .set(shape, { ...ISLAND_SHAPES.collapsed })
    .set(fill, getFillVars('collapsed'))
    .set(outline, getOutlineVars('collapsed'))
    .set(flyer, getFitVars(flyer, pillAnchor))
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
export const buildHoverTween = ({ shape, inflated, onRender }: HoverTweenParams): gsap.core.Tween => {
  const size   = inflated ? HOVER_SHAPE : ISLAND_SHAPES.collapsed;
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
export const setCollapsedPose = ({ elements, shape, onRender }: IslandPoseParams) => {
  const targets = resolveTargets(elements);
  if (!targets) return;

  Object.assign(shape, ISLAND_SHAPES.collapsed);
  onRender();

  gsap.set(targets.panel, { opacity: 1 });
  gsap.set(targets.fill, getFillVars('collapsed'));
  gsap.set(targets.outline, getOutlineVars('collapsed'));
  gsap.set(targets.content, { opacity: 0, y: 0 });
  gsap.set(targets.lift, { y: 0 });
  gsap.set(targets.squash, { scaleX: 1, scaleY: 1, rotation: 0 });
  gsap.set(targets.flyer, getFitVars(targets.flyer, targets.pillAnchor));
};

// Live notice: the pill grows (same elastic as the panel), Glup moves to its left end and the result shows.
// Reversing it brings everything back to the pill.
export const buildNoticeTimeline = ({ elements, shape, onRender }: IslandPoseParams): gsap.core.Timeline | null => {
  const [flyer, anchor, text] = [elements.flyer.current, elements.noticeAnchor.current, elements.noticeText.current];
  if (!flyer || !anchor || !text) return null;

  const { grow, flight, text: reveal } = NOTICE_MOTION;

  return gsap
    .timeline({ paused: true, onUpdate: onRender })
    .to(shape, { ...NOTICE_SHAPE, duration: grow.duration, ease: grow.ease }, 0)
    .to(flyer, { ...getFitVars(flyer, anchor), duration: flight.duration, ease: flight.ease }, 0)
    .fromTo(text, { opacity: 0, x: -6 }, { opacity: 1, x: 0, duration: reveal.duration, ease: reveal.ease }, reveal.delay);
};
