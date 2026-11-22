import { useCallback, useEffect, useMemo, useRef } from 'react';
import type { RefObject } from 'react';
import gsap from 'gsap';
import { MASCOT_FACES, MASCOT_IDLE, MASCOT_MOTION } from '@/modules/island/constants/islandMascot';
import type { IslandElements } from '@/modules/island/interfaces/islandElements';
import type { IslandMascot } from '@/modules/island/interfaces/islandMascot';
import { buildIdleMove, pickIdleMove, scaleEyes } from '@/modules/island/utils/mascotMoves';
import type { MascotController } from '@/modules/mascot/interfaces/controller';
import type { Face } from '@/modules/mascot/interfaces/face';

interface UseIslandMascotParams {
  elements  : IslandElements;
  mascotRef : RefObject<MascotController | null>;
  reduced   : RefObject<boolean>;
}

// Glup's mood around the island: faces on opening and closing, and short idle moves while the panel rests.
export const useIslandMascot = ({ elements, mascotRef, reduced }: UseIslandMascotParams): IslandMascot => {
  const faceReset = useRef<gsap.core.Tween | null>(null);
  const idleCall  = useRef<gsap.core.Tween | null>(null);
  const idleMove  = useRef<gsap.core.Timeline | null>(null);

  // Shows a face, optionally only for `hold` seconds.
  const express = useCallback((face: Partial<Face> | null, hold?: number) => {
    const controller = mascotRef.current;

    faceReset.current?.kill();
    faceReset.current = null;
    controller?.express(face);

    if (controller && hold) faceReset.current = gsap.delayedCall(hold, () => controller.express(null));
  }, [mascotRef]);

  const excite = useCallback(() => {
    express(MASCOT_FACES.excited);
    if (mascotRef.current && !reduced.current) scaleEyes(mascotRef.current, MASCOT_MOTION.eyes.scale);
  }, [express, mascotRef, reduced]);

  const celebrate = useCallback(() => {
    if (mascotRef.current) scaleEyes(mascotRef.current, 1);
    express(MASCOT_FACES.celebrating, MASCOT_MOTION.celebrate.hold);
    void mascotRef.current?.gesture('wave');
  }, [express, mascotRef]);

  const farewell = useCallback((wave: boolean) => {
    express(MASCOT_FACES.farewell, MASCOT_MOTION.farewell.hold);
    if (wave) void mascotRef.current?.gesture('wave-once');
  }, [express, mascotRef]);

  const calm = useCallback(() => {
    express(null);
    mascotRef.current?.look(null);
    if (mascotRef.current) scaleEyes(mascotRef.current, 1);
  }, [express, mascotRef]);

  const stopIdle = useCallback(() => {
    idleCall.current?.kill();
    idleMove.current?.kill();
    idleCall.current = null;
    idleMove.current = null;

    mascotRef.current?.look(null);
    if (elements.lift.current) gsap.set(elements.lift.current, { y: 0 });
    if (elements.squash.current) gsap.set(elements.squash.current, { rotation: 0 });
  }, [elements, mascotRef]);

  // Every few seconds, a random short move, skipped while Glup is busy eating, working and so on.
  const scheduleIdle = useCallback(() => {
    const delay = gsap.utils.random(MASCOT_IDLE.minDelay, MASCOT_IDLE.maxDelay);

    idleCall.current = gsap.delayedCall(delay, () => {
      const controller = mascotRef.current;
      const lift       = elements.lift.current;
      const squash     = elements.squash.current;

      if (controller?.isIdle() && lift && squash) {
        idleMove.current = buildIdleMove({ kind: pickIdleMove(), controller, lift, squash });
      }

      scheduleIdle();
    });
  }, [elements, mascotRef]);

  const startIdle = useCallback(() => {
    stopIdle();
    if (!reduced.current) scheduleIdle();
  }, [stopIdle, scheduleIdle, reduced]);

  useEffect(
    () => () => {
      faceReset.current?.kill();
      idleCall.current?.kill();
      idleMove.current?.kill();
    },
    [],
  );

  return useMemo(
    () => ({ excite, celebrate, farewell, calm, startIdle, stopIdle }),
    [excite, celebrate, farewell, calm, startIdle, stopIdle],
  );
};
