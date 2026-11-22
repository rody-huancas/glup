import { useCallback, useEffect, useRef, useState } from 'react';
import { ACTIONS_TEXTS } from '@/modules/actions/constants/texts';
import { ACTIONS_TIMING } from '@/modules/actions/constants/timing';
import type { FileSelection } from '@/modules/actions/interfaces/fileSelection';
import type { IslandFlow } from '@/modules/island/types/islandState';
import type { MascotState } from '@/modules/mascot/types/mascotState';

interface UseIslandFlowParams {
  mascot        : MascotState;
  load          : (paths: string[]) => Promise<FileSelection | null>;
  commandMascot : (state: MascotState) => void;
  onRejected    : () => void;
  onEaten       : () => void;
  onNoticeEnd   : () => void;
}

type EatingStep = 'requested' | 'started' | null;

export const useIslandFlow = (params: UseIslandFlowParams) => {
  const [flow, setFlow]     = useState<IslandFlow>('idle');
  const [notice, setNotice] = useState<string | null>(null);
  const handlers            = useRef(params);
  const eatingStep          = useRef<EatingStep>(null);
  const noticeTimer         = useRef(0);

  useEffect(() => {
    handlers.current = params;
  }, [params]);

  const reset = useCallback(() => {
    window.clearTimeout(noticeTimer.current);
    eatingStep.current = null;
    setFlow('idle');
    setNotice(null);
  }, []);

  const handleDrop = useCallback(async (paths: string[]) => {
    console.log('Dropped paths:', paths);

    reset();
    setFlow('eating');

    const selection = await handlers.current.load(paths).catch(() => null);

    if (!selection) {
      handlers.current.commandMascot({ type: 'confused' });
      setFlow('notice');
      setNotice(ACTIONS_TEXTS.rejected);
      handlers.current.onRejected();
      noticeTimer.current = window.setTimeout(() => handlers.current.onNoticeEnd(), ACTIONS_TIMING.rejectedTime);
      return;
    }

    eatingStep.current = 'requested';
    handlers.current.commandMascot({ type: 'eating', kind: selection.type });
  }, [reset]);

  // Opens the actions once the mascot has started and then finished eating.
  useEffect(() => {
    if (eatingStep.current === 'requested' && params.mascot.type === 'eating') {
      eatingStep.current = 'started';
      return;
    }

    if (eatingStep.current === 'started' && params.mascot.type !== 'eating') {
      eatingStep.current = null;
      setFlow('idle');
      handlers.current.onEaten();
    }
  }, [params.mascot]);

  useEffect(() => () => window.clearTimeout(noticeTimer.current), []);

  return { flow, notice, handleDrop, reset };
};
