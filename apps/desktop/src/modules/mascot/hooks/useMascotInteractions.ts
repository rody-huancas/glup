import { useCallback, useEffect, useMemo, useRef } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { IDLE_STATE } from '@/modules/mascot/constants/mascot';
import { usePointerDrag } from '@/modules/mascot/hooks/usePointerDrag';
import type { MascotState } from '@/modules/mascot/types/mascotState';
import { useFileDrop } from '@/shared/hooks/useFileDrop';

interface UseMascotInteractionsParams {
  setState     : Dispatch<SetStateAction<MascotState>>;
  onClick?     : () => void;
  reactToDrops : boolean;
}

export const useMascotInteractions = ({ setState, onClick, reactToDrops }: UseMascotInteractionsParams) => {
  const clickRef = useRef(onClick);
  const dropsRef = useRef(reactToDrops);

  useEffect(() => {
    clickRef.current = onClick;
    dropsRef.current = reactToDrops;
  }, [onClick, reactToDrops]);

  const handleClick = useCallback(() => {
    setState({ type: 'happy' });
    clickRef.current?.();
  }, [setState]);

  // The drop reaction (eating or confused) is decided by whoever validates the files.
  const dropHandlers = useMemo(
    () => ({
      onEnter : () => dropsRef.current && setState({ type: 'alert' }),
      onLeave : () => dropsRef.current && setState(IDLE_STATE),
      onDrop  : () => undefined,
    }),
    [setState],
  );

  useFileDrop(dropHandlers);

  return usePointerDrag(handleClick);
};
