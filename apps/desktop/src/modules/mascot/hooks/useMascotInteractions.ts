import { useCallback, useMemo } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { IDLE_STATE } from '@/modules/mascot/constants/mascot';
import { useFileDrop } from '@/modules/mascot/hooks/useFileDrop';
import { usePointerDrag } from '@/modules/mascot/hooks/usePointerDrag';
import type { MascotState } from '@/modules/mascot/types/mascotState';
import { getFileKind } from '@/modules/mascot/utils/fileKind';

export const useMascotInteractions = (setState: Dispatch<SetStateAction<MascotState>>) => {
  const onClick = useCallback(() => setState({ type: 'happy' }), [setState]);

  const dropHandlers = useMemo(
    () => ({
      onEnter : () => setState({ type: 'alert' }),
      onLeave : () => setState(IDLE_STATE),
      onDrop  : (paths: string[]) => {
        console.log('Dropped paths:', paths);

        const kind = paths[0] ? getFileKind(paths[0]) : null;
        setState(kind ? { type: 'eating', kind } : { type: 'confused' });
      },
    }),
    [setState],
  );

  useFileDrop(dropHandlers);

  return usePointerDrag(onClick);
};
