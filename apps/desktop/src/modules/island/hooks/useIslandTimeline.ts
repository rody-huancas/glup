import { useCallback, useMemo, useRef } from 'react';
import type { Dispatch, RefObject, SetStateAction } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { Flip } from 'gsap/Flip';
import { ISLAND_SHAPES } from '@/modules/island/constants/islandShape';
import { REDUCED_MOTION } from '@/modules/island/constants/islandTimeline';
import { useIslandMascot } from '@/modules/island/hooks/useIslandMascot';
import type { IslandElements } from '@/modules/island/interfaces/islandElements';
import type { IslandShape } from '@/modules/island/interfaces/islandShape';
import type { IslandMotion } from '@/modules/island/interfaces/islandTimeline';
import type { IslandState, VisibleIslandState } from '@/modules/island/types/islandState';
import { getIslandArea } from '@/modules/island/utils/islandArea';
import type { IslandAreaKind } from '@/modules/island/utils/islandArea';
import { renderIslandShape } from '@/modules/island/utils/islandShape';
import { buildHoverTween, buildIslandTimeline, setCollapsedPose } from '@/modules/island/utils/islandTimeline';
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
  const start = useCallback(async (target: VisibleIslandState) => {
    const current: IslandMotion = { builtFor: target, target, timeline: null };
    motion.current              = current;

    stopHover();
    if (target === 'collapsed') mascot.stopIdle();
    if (target === 'expanded') await setArea('frame');
    if (motion.current !== current) return;

    if (current.target !== target) {
      motion.current = null;
      void finish(current.target);
      return;
    }

    setState(target);
    createTimeline(current);
  }, [stopHover, mascot, setArea, finish, setState, createTimeline]);

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
    (target: VisibleIslandState) =>
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
        else void start(target);
      }),
    [resolveWaiters, redirect, start],
  );

  // Only the resting pill reacts to hover; an opening starts from wherever the inflate left it.
  const hover = useMemo(
    () =>
      contextSafe((inflated: boolean) => {
        if (motion.current || settled.current !== 'collapsed' || reduced.current) return;

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
    mascot.stopIdle();
    mascot.calm();
    resolveWaiters(false);
    snapToPill();
    setState('hidden');
    await setArea('collapsed');
  }, [stopHover, mascot, resolveWaiters, snapToPill, setState, setArea]);

  const reveal = useCallback(() => {
    setState((previous) => (previous === 'hidden' ? 'collapsed' : previous));
  }, [setState]);

  return { transitionTo, hide, reveal, hover };
};
