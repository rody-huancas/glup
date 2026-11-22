import { useCallback, useEffect, useRef, useState } from 'react';
import { ACTIONS_TIMING } from '@/modules/actions/constants/timing';
import type { FileSelection } from '@/modules/actions/interfaces/fileSelection';
import { getFilesInfo } from '@/modules/actions/services/filesInfo';
import { runAction } from '@/modules/actions/services/runAction';
import type { ActionId } from '@/modules/actions/types/actionId';
import type { ActionsPhase } from '@/modules/actions/types/actionsPhase';
import { createSelection } from '@/modules/actions/utils/selection';

interface UseActionSelectionParams {
  onFinished: () => void;
}

export const useActionSelection = ({ onFinished }: UseActionSelectionParams) => {
  const [selection, setSelection] = useState<FileSelection | null>(null);
  const [phase, setPhase]         = useState<ActionsPhase>('choosing');
  const timers                    = useRef<number[]>([]);
  const finishedRef               = useRef(onFinished);

  useEffect(() => {
    finishedRef.current = onFinished;
  }, [onFinished]);

  const clearTimers = useCallback(() => {
    timers.current.forEach((timer) => window.clearTimeout(timer));
    timers.current = [];
  }, []);

  const schedule = useCallback((callback: () => void, delay: number) => {
    timers.current.push(window.setTimeout(callback, delay));
  }, []);

  const load = useCallback(async (paths: string[]): Promise<FileSelection | null> => {
    clearTimers();

    const files = await getFilesInfo(paths);
    const next  = createSelection({ paths, files });

    setSelection(next);
    setPhase('choosing');
    return next;
  }, [clearTimers]);

  const choose = useCallback((actionId: ActionId) => {
    if (!selection || phase !== 'choosing') return;

    void runAction({ actionId, paths: selection.paths });
    setPhase('working');

    schedule(() => {
      setPhase('learning');
      schedule(() => finishedRef.current(), ACTIONS_TIMING.learningTime);
    }, ACTIONS_TIMING.workingTime);
  }, [selection, phase, schedule]);

  const discard = useCallback(() => {
    clearTimers();
    setSelection(null);
    setPhase('choosing');
  }, [clearTimers]);

  useEffect(() => clearTimers, [clearTimers]);

  return { selection, phase, load, choose, discard };
};
