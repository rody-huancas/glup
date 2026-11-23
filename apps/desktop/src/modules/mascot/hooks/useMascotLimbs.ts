import { useCallback, useEffect, useRef } from 'react';
import gsap from 'gsap';
import { LIMB_MOTION } from '@/modules/mascot/constants/limbs';
import type { MascotElements } from '@/modules/mascot/interfaces/elements';
import type { MascotGesture } from '@/modules/mascot/types/mascotGesture';
import type { MascotState } from '@/modules/mascot/types/mascotState';
import {
  applyPivots,
  buildBreathSway,
  buildFootTap,
  buildGesture,
  buildStillGesture,
  buildStateMotion,
  getSwayTargets,
  resetLimbs,
  resolveLimbs,
} from '@/modules/mascot/utils/limbMotions';
import { usePrefersReducedMotion } from '@/shared/hooks/usePrefersReducedMotion';

interface UseMascotLimbsParams {
  elements : MascotElements;
  state    : MascotState;
  // False where the limbs cannot be seen (the collapsed pill): nothing is animated.
  enabled  : boolean;
}

// Arms and feet: breathing sway always, a motion per state, idle foot taps and gestures on demand.
// With prefers-reduced-motion nothing swings: the face changes and the gestures that say something
// (greeting, pointing at a button) keep their pose still for the same time.
export const useMascotLimbs = ({ elements, state, enabled }: UseMascotLimbsParams) => {
  const reduced    = usePrefersReducedMotion();
  const active     = enabled && !reduced;
  const motion     = useRef<gsap.core.Animation | null>(null);
  const tapCall    = useRef<gsap.core.Tween | null>(null);
  const gesture    = useRef<gsap.core.Timeline | null>(null);
  const stateRef   = useRef(state);
  const enabledRef = useRef(enabled);
  const reducedRef = useRef(reduced);

  useEffect(() => {
    stateRef.current   = state;
    enabledRef.current = enabled;
    reducedRef.current = reduced;
  }, [state, enabled, reduced]);

  useEffect(() => applyPivots(elements), [elements]);

  useEffect(() => {
    if (!active) return;

    const sway = buildBreathSway(getSwayTargets(elements));

    return () => {
      sway?.kill();
      gsap.set(getSwayTargets(elements), { rotation: 0 });
    };
  }, [active, elements]);

  // Also when Glup goes back to the pill: a still gesture cut short there must not leave a hand raised.
  useEffect(() => {
    const limbs = resolveLimbs(elements);
    if (!limbs) return;

    gesture.current?.kill();
    resetLimbs(limbs, active ? LIMB_MOTION.reset : 0);
    if (!active) return;

    if (state.type !== 'idle') {
      motion.current = buildStateMotion(state.type, limbs);
      return () => {
        motion.current?.kill();
        motion.current = null;
      };
    }

    const { minDelay, maxDelay } = LIMB_MOTION.tap;

    const scheduleTap = () => {
      tapCall.current = gsap.delayedCall(gsap.utils.random(minDelay, maxDelay), () => {
        if (!gesture.current?.isActive()) motion.current = buildFootTap(limbs);
        scheduleTap();
      });
    };

    scheduleTap();

    return () => {
      tapCall.current?.kill();
      motion.current?.kill();
      tapCall.current = null;
      motion.current  = null;
    };
  }, [state, active, enabled, elements]);

  // Gestures only play while idle and visible; the promise resolves when they end (or right away if skipped).
  const play = useCallback((name: MascotGesture): Promise<void> => {
    const limbs = resolveLimbs(elements);

    if (!limbs || !enabledRef.current || stateRef.current.type !== 'idle') return Promise.resolve();

    const timeline = reducedRef.current ? buildStillGesture(name, limbs) : buildGesture(name, limbs);
    if (!timeline) return Promise.resolve();

    motion.current?.kill();
    gesture.current?.kill();

    return new Promise((resolve) => {
      gesture.current = timeline.eventCallback('onComplete', () => resolve());
    });
  }, [elements]);

  useEffect(
    () => () => {
      gesture.current?.kill();
      tapCall.current?.kill();
      motion.current?.kill();
    },
    [],
  );

  return { gesture: play };
};
