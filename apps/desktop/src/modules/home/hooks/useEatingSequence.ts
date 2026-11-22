import { useCallback, useEffect, useRef } from 'react';
import type { MascotState } from '@/modules/mascot/types/mascotState';

interface UseEatingSequenceParams {
  mascotState : MascotState;
  onDone      : () => void;
}

type EatingStep = 'requested' | 'started' | null;

// Calls onDone once the mascot has started and then finished eating.
export const useEatingSequence = ({ mascotState, onDone }: UseEatingSequenceParams) => {
  const step    = useRef<EatingStep>(null);
  const doneRef = useRef(onDone);

  useEffect(() => {
    doneRef.current = onDone;
  }, [onDone]);

  useEffect(() => {
    if (step.current === 'requested' && mascotState.type === 'eating') {
      step.current = 'started';
      return;
    }

    if (step.current === 'started' && mascotState.type !== 'eating') {
      step.current = null;
      doneRef.current();
    }
  }, [mascotState]);

  const start  = useCallback(() => { step.current = 'requested'; }, []);
  const cancel = useCallback(() => { step.current = null; }, []);

  return { start, cancel };
};
