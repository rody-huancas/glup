import { useCallback, useMemo, useRef, useState } from 'react';
import type { Dispatch, RefObject, SetStateAction } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { Flip } from 'gsap/Flip';
import { ISLAND_SHAPES } from '@/modules/island/constants/islandShape';
import { NOTICE_MOTION, REDUCED_MOTION } from '@/modules/island/constants/islandTimeline';
import { useIslandMascot } from '@/modules/island/hooks/useIslandMascot';
import type { IslandElements } from '@/modules/island/interfaces/islandElements';
import type { IslandNotice } from '@/modules/island/interfaces/islandNotice';
import type { IslandShape } from '@/modules/island/interfaces/islandShape';
import type { IslandMotion } from '@/modules/island/interfaces/islandTimeline';
import type { IslandState, VisibleIslandState } from '@/modules/island/types/islandState';
import { getIslandArea } from '@/modules/island/utils/islandArea';
import type { IslandAreaKind } from '@/modules/island/utils/islandArea';
import { renderIslandShape } from '@/modules/island/utils/islandShape';
import { buildHoverTween, buildIslandTimeline, buildNoticeTimeline, setCollapsedPose } from '@/modules/island/utils/islandTimeline';
import { setIslandArea } from '@/modules/island/utils/islandWindow';
import type { MascotController } from '@/modules/mascot/interfaces/controller';

gsap.registerPlugin(useGSAP, Flip);

interface UseIslandTimelineParams {
  elements  : IslandElements;
  setState  : Dispatch<SetStateAction<IslandState>>;
  mascotRef : RefObject<MascotController | null>;
}

type Settle = (done: boolean) => void;

const opposite = (state: VisibleIslandState): VisibleIslandState => (state === 'expanded' ? 'collapsed' : 'expanded');

// Each transition resolves true when the island settles on its target, false when another one replaces it.
export const useIslandTimeline = ({ elements, setState, mascotRef }: UseIslandTimelineParams) => {
  const motion  = useRef<IslandMotion | null>(null);
  const settled = useRef<VisibleIslandState>('collapsed');
  // Glup is out of the pill (opening, open or closing): only then its arms and feet are seen and animated.
  const [limbsVisible, setLimbsVisible] = useState(false);
  const [notice, setNotice]             = useState<IslandNotice | null>(null);
  const noticeLine                      = useRef<gsap.core.Timeline | null>(null);
  const noticeHold                      = useRef<gsap.core.Tween | null>(null);
  const waiters = useRef<Settle[]>([]);
  const reduced = useRef(false);
  const area    = useRef<Promise<void>>(Promise.resolve());
  const shape   = useRef<IslandShape>({ ...ISLAND_SHAPES.collapsed });
  const hovered = useRef<gsap.core.Tween | null>(null);

  const mascot = useIslandMascot({ elements, mascotRef, reduced });

  // GSAP animates the shape proxy; every frame redraws the silhouette from it.
  const render = useCallback(() => renderIslandShape({ elements, shape: shape.current }), [elements]);

  const { contextSafe } = useGSAP(
    () => {
      setCollapsedPose({ elements, shape: shape.current, onRender: render });

      const media = gsap.matchMedia();

      media.add(REDUCED_MOTION.query, () => {
        reduced.current = true;

        return () => {
          reduced.current = false;
        };
      });

      return () => media.revert();
    },
    { scope: elements.panel },
  );

  // Region changes run in order, so a late shrink can never land after a grow.
  const setArea = useCallback((kind: IslandAreaKind): Promise<void> => {
    area.current = area.current.then(() => setIslandArea(getIslandArea(kind))).catch(() => undefined);
    return area.current;
  }, []);

  const stopHover = useCallback(() => {
    hovered.current?.kill();
    hovered.current = null;
  }, []);

  // Drops the live notice where it is: an opening takes over from that shape, a hide snaps to the pill.
  const stopNotice = useCallback(() => {
    noticeHold.current?.kill();
    noticeLine.current?.kill();
    noticeHold.current = null;
    noticeLine.current = null;
    if (elements.noticeText.current) gsap.set(elements.noticeText.current, { opacity: 0 });
    setNotice(null);
  }, [elements]);

  const resolveWaiters = useCallback((done: boolean) => {
    const pending   = waiters.current;
    waiters.current = [];
    pending.forEach((settle) => settle(done));
  }, []);

  // The region only shrinks to the pill once nothing else is left on screen.
  const finish = useCallback(async (state: VisibleIslandState) => {
    motion.current?.timeline?.kill();
    motion.current  = null;
    settled.current = state;

    if (state === 'expanded') mascot.startIdle();
    else mascot.calm();

    setLimbsVisible(state === 'expanded');

    await setArea(state);
    if (!motion.current) resolveWaiters(true);
  }, [mascot, setArea, resolveWaiters]);

  // contextSafe ties the timelines to the component, so they are reverted on unmount.
  const createTimeline = useMemo(
    () =>
      contextSafe((current: IslandMotion) => {
        const timeline = buildIslandTimeline({
          elements,
          target         : current.builtFor,
          reduced        : reduced.current,
          shape          : shape.current,
          cues           : mascot,
          farewell       : current.farewell,
          onRender       : render,
          onShapeSettled : () => void setArea('expanded'),
        });

        if (!timeline) {
          void finish(current.builtFor);
          return;
        }

        current.timeline = timeline
          .eventCallback('onComplete', () => void finish(current.builtFor))
          .eventCallback('onReverseComplete', () => void finish(opposite(current.builtFor)))
          .play();
      }),
    [contextSafe, elements, mascot, render, setArea, finish],
  );

  // The expansion overshoots the panel, so it always runs inside the whole window.
  const start = useCallback(async (target: VisibleIslandState, farewell: boolean) => {
    const current: IslandMotion = { builtFor: target, target, farewell, timeline: null };
    motion.current              = current;

    stopHover();
    stopNotice();
    if (target === 'collapsed') mascot.stopIdle();
    if (target === 'expanded') await setArea('frame');
    if (motion.current !== current) return;

    if (current.target !== target) {
      motion.current = null;
      void finish(current.target);
      return;
    }

    setState(target);
    setLimbsVisible(true);
    createTimeline(current);
  }, [stopHover, stopNotice, mascot, setArea, finish, setState, createTimeline]);

  // Turns the running timeline around from wherever it is, without restarting it.
  const redirect = useCallback((current: IslandMotion, target: VisibleIslandState) => {
    current.target = target;
    setState(target);

    if (target === 'collapsed') mascot.stopIdle();
    if (current.builtFor === 'expanded') void setArea('frame');
    if (!current.timeline) return;

    if (target === current.builtFor) current.timeline.play();
    else current.timeline.reverse();
  }, [mascot, setState, setArea]);

  const transitionTo = useCallback(
    // farewell: the user closed on purpose (Recoger, Esc), so Glup waves goodbye.
    (target: VisibleIslandState, farewell = false) =>
      new Promise<boolean>((resolve) => {
        const current = motion.current;

        if (current?.target === target) {
          waiters.current.push(resolve);
          return;
        }

        if (!current && settled.current === target) {
          waiters.current.push(resolve);
          resolveWaiters(true);
          return;
        }

        resolveWaiters(false);
        waiters.current.push(resolve);

        if (current) redirect(current, target);
        else void start(target, farewell);
      }),
    [resolveWaiters, redirect, start],
  );

  // Only the resting pill reacts to hover; an opening starts from wherever the inflate left it.
  const hover = useMemo(
    () =>
      contextSafe((inflated: boolean) => {
        if (motion.current || noticeLine.current || settled.current !== 'collapsed' || reduced.current) return;

        stopHover();
        hovered.current = buildHoverTween({ shape: shape.current, inflated, onRender: render });
      }),
    [contextSafe, stopHover, render],
  );

  const snapToPill = useMemo(
    () => contextSafe(() => setCollapsedPose({ elements, shape: shape.current, onRender: render })),
    [contextSafe, elements, render],
  );

  // Drops any running transition so nothing can override the hidden state.
  const hide = useCallback(async () => {
    motion.current?.timeline?.kill();
    motion.current  = null;
    settled.current = 'collapsed';

    stopHover();
    stopNotice();
    mascot.stopIdle();
    mascot.calm();
    resolveWaiters(false);
    snapToPill();
    setLimbsVisible(false);
    setState('hidden');
    await setArea('collapsed');
  }, [stopHover, stopNotice, mascot, resolveWaiters, snapToPill, setState, setArea]);

  const reveal = useCallback(() => {
    setState((previous) => (previous === 'hidden' ? 'collapsed' : previous));
  }, [setState]);

  // A task ended with the island collapsed: the pill widens with the result for a few seconds.
  // Hovering it then opens the panel as usual (the opening starts from the wide pill).
  const notify = useMemo(
    () =>
      contextSafe((next: IslandNotice) => {
        if (motion.current || settled.current !== 'collapsed' || reduced.current) return;

        stopHover();
        stopNotice();
        setNotice(next);

        void setArea('notice').then(() => {
          if (motion.current) return;

          const timeline = buildNoticeTimeline({ elements, shape: shape.current, onRender: render });
          if (!timeline) return;

          noticeLine.current = timeline.play();
          noticeHold.current = gsap.delayedCall(NOTICE_MOTION.hold, () => {
            timeline.eventCallback('onReverseComplete', () => {
              noticeLine.current = null;
              setNotice(null);
              void setArea('collapsed');
            });
            timeline.reverse();
          });
        });
      }),
    [contextSafe, stopHover, stopNotice, setArea, elements, render],
  );

  return { transitionTo, hide, reveal, hover, limbsVisible, notice, notify };
};
