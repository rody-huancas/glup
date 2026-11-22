import { useCallback, useMemo, useRef, useState } from 'react';
import type { RefObject } from 'react';
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
import type { VisibleIslandState } from '@/modules/island/types/islandState';
import { getIslandArea } from '@/modules/island/utils/islandArea';
import type { IslandAreaKind } from '@/modules/island/utils/islandArea';
import { renderIslandShape } from '@/modules/island/utils/islandShape';
import { buildHoverTween, buildIslandTimeline, buildNoticeTimeline, setCollapsedPose } from '@/modules/island/utils/islandTimeline';
import { logIsland } from '@/modules/island/utils/islandLog';
import { setIslandArea } from '@/modules/island/utils/islandWindow';
import type { MascotController } from '@/modules/mascot/interfaces/controller';

gsap.registerPlugin(useGSAP, Flip);

// The island state lives in the machine (useIslandMachine); this hook only animates and sets the region.
interface UseIslandTimelineParams {
  elements  : IslandElements;
  mascotRef : RefObject<MascotController | null>;
  // setState  : Dispatch<SetStateAction<IslandState>>;
}

interface ShowNoticeParams {
  notice : IslandNotice;
  // Called once the pill is back, or right away when the notice cannot be shown.
  onEnd  : () => void;
}

type Settle = (done: boolean) => void;

const opposite = (state: VisibleIslandState): VisibleIslandState => (state === 'expanded' ? 'collapsed' : 'expanded');

// Each transition resolves true when the island settles on its target, false when another one replaces it.
export const useIslandTimeline = ({ elements, mascotRef }: UseIslandTimelineParams) => {
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
  const noticeEnd = useRef<(() => void) | null>(null);

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
    area.current = area.current
      .then(() => {
        logIsland(`región → ${kind}`);
        return setIslandArea(getIslandArea(kind));
      })
      .catch(() => undefined);
    // area.current = area.current.then(() => setIslandArea(getIslandArea(kind))).catch(() => undefined);
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
    noticeEnd.current  = null;
    if (elements.noticeText.current) gsap.set(elements.noticeText.current, { opacity: 0 });
    setNotice(null);
  }, [elements]);

  const resolveWaiters = useCallback((done: boolean) => {
    const pending   = waiters.current;
    waiters.current = [];
    pending.forEach((settle) => settle(done));
  }, []);

  const snapToPill = useMemo(
    () => contextSafe(() => setCollapsedPose({ elements, shape: shape.current, onRender: render })),
    [contextSafe, elements, render],
  );

  // The region only shrinks to the pill once nothing else is left on screen. Landing on the pill always
  // snaps to its exact pose, so a reversed opening that started from the wide notice never leaves Glup
  // or the silhouette outside the small region.
  const finish = useCallback(async (state: VisibleIslandState) => {
    motion.current?.timeline?.kill();
    motion.current  = null;
    settled.current = state;

    if (state === 'collapsed') snapToPill();

    if (state === 'expanded') mascot.startIdle();
    else mascot.calm();

    setLimbsVisible(state === 'expanded');

    await setArea(state);
    if (!motion.current) resolveWaiters(true);
  }, [mascot, setArea, resolveWaiters, snapToPill]);

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

    // setState(target);
    setLimbsVisible(true);
    createTimeline(current);
  }, [stopHover, stopNotice, mascot, setArea, finish, createTimeline]);

  // Turns the running timeline around from wherever it is, without restarting it.
  // A timeline still at its very start cannot be reversed (GSAP fires nothing), so it settles right away.
  const redirect = useCallback((current: IslandMotion, target: VisibleIslandState) => {
    current.target = target;
    // setState(target);

    if (target === 'collapsed') mascot.stopIdle();
    if (current.builtFor === 'expanded') void setArea('frame');
    if (!current.timeline) return;

    if (target === current.builtFor) current.timeline.play();
    else if (current.timeline.time() === 0) void finish(target);
    else current.timeline.reverse();
  }, [mascot, setArea, finish]);

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

  // Drops any running transition and lands on a clean pill: used to hide (fullscreen, tray) and for
  // hard resets (tray, watchdog).
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
    // setState('hidden');
    await setArea('collapsed');
  }, [stopHover, stopNotice, mascot, resolveWaiters, snapToPill, setArea]);

  // Leaving hidden is now a reset of the machine (hide above); the state no longer lives here.
  // const reveal = useCallback(() => {
  //   setState((previous) => (previous === 'hidden' ? 'collapsed' : previous));
  // }, [setState]);

  // A task ended with the island collapsed: the pill widens with the result for a few seconds, then comes
  // back to the exact pill. A second result while it is showing only swaps the text and restarts the
  // wait (stacking a new timeline used to leave the pill wide, with Glup outside the region).
  const showNotice = useMemo(
    () =>
      contextSafe(({ notice: next, onEnd }: ShowNoticeParams) => {
        const end = () => {
          const ended = noticeEnd.current ?? onEnd;

          noticeHold.current = null;
          noticeLine.current = null;
          noticeEnd.current  = null;
          setNotice(null);
          snapToPill();
          void setArea('collapsed').then(ended);
        };

        const hold = (timeline: gsap.core.Timeline) => {
          noticeHold.current?.kill();
          noticeHold.current = gsap.delayedCall(NOTICE_MOTION.hold, () => {
            timeline.eventCallback('onReverseComplete', end);
            timeline.reverse();
          });
        };

        if (noticeLine.current) {
          setNotice(next);
          noticeEnd.current = onEnd;
          hold(noticeLine.current.play());
          return;
        }

        if (motion.current || settled.current !== 'collapsed' || reduced.current) {
          onEnd();
          return;
        }

        stopHover();
        setNotice(next);
        noticeEnd.current = onEnd;

        void setArea('notice').then(() => {
          if (motion.current || noticeEnd.current !== onEnd) return;

          const timeline = buildNoticeTimeline({ elements, shape: shape.current, onRender: render });
          if (!timeline) return end();

          noticeLine.current = timeline.play();
          hold(timeline);
        });
      }),
    [contextSafe, stopHover, setArea, elements, render, snapToPill],
  );

  // Nothing is moving: the watchdog can compare the region with the real window.
  const isMoving = useCallback(() => motion.current !== null || noticeLine.current !== null, []);

  //   // A task ended with the island collapsed: the pill widens with the result for a few seconds.
  //   // Hovering it then opens the panel as usual (the opening starts from the wide pill).
  //   const notify = useMemo(
  //     () =>
  //       contextSafe((next: IslandNotice) => {
  //         if (motion.current || settled.current !== 'collapsed' || reduced.current) return;
  //
  //         stopHover();
  //         stopNotice();
  //         setNotice(next);
  //
  //         void setArea('notice').then(() => {
  //           if (motion.current) return;
  //
  //           const timeline = buildNoticeTimeline({ elements, shape: shape.current, onRender: render });
  //           if (!timeline) return;
  //
  //           noticeLine.current = timeline.play();
  //           noticeHold.current = gsap.delayedCall(NOTICE_MOTION.hold, () => {
  //             timeline.eventCallback('onReverseComplete', () => {
  //               noticeLine.current = null;
  //               setNotice(null);
  //               void setArea('collapsed');
  //             });
  //             timeline.reverse();
  //           });
  //         });
  //       }),
  //     [contextSafe, stopHover, stopNotice, setArea, elements, render],
  //   );
  //

  return { transitionTo, hide, hover, limbsVisible, notice, showNotice, isMoving };
  // return { transitionTo, hide, reveal, hover, limbsVisible, notice, notify };
};
