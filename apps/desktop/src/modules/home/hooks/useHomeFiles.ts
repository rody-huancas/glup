import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ACTIONS_TEXTS } from '@/modules/actions/constants/texts';
import { ACTIONS_TIMING } from '@/modules/actions/constants/timing';
import { useActionSelection } from '@/modules/actions/hooks/useActionSelection';
import { pickFiles as openFileDialog } from '@/modules/actions/services/fileDialog';
import { useEatingSequence } from '@/modules/home/hooks/useEatingSequence';
import type { HomeFiles } from '@/modules/home/interfaces/homeFiles';
import { IDLE_STATE } from '@/modules/mascot/constants/mascot';
import type { MascotController } from '@/modules/mascot/interfaces/controller';
import type { MascotState } from '@/modules/mascot/types/mascotState';
import { useFileDrop } from '@/shared/hooks/useFileDrop';

interface UseHomeFilesParams {
  commandAvatar   : (state: MascotState) => void;
  onFilesIncoming : () => void;
}

export const useHomeFiles = ({ commandAvatar, onFilesIncoming }: UseHomeFilesParams): HomeFiles => {
  const [dragging, setDragging]       = useState(false);
  const [notice, setNotice]           = useState<string | null>(null);
  const [showActions, setShowActions] = useState(false);
  const [dropState, setDropState]     = useState<MascotState>(IDLE_STATE);
  const dropMascotRef                 = useRef<MascotController | null>(null);
  const noticeTimer                   = useRef(0);
  const discardRef                    = useRef<() => void>(() => undefined);
  const incomingRef                   = useRef(onFilesIncoming);

  useEffect(() => {
    incomingRef.current = onFilesIncoming;
  }, [onFilesIncoming]);

  const onFinished = useCallback(() => discardRef.current(), []);
  const actions    = useActionSelection({ onFinished });
  const eating     = useEatingSequence({ mascotState: dropState, onDone: () => setShowActions(true) });

  const close = useCallback(() => {
    eating.cancel();
    actions.discard();
    setShowActions(false);
    setDropState(IDLE_STATE);
  }, [eating, actions]);

  useEffect(() => {
    discardRef.current = close;
  }, [close]);

  const handlePaths = useCallback(async (paths: string[]) => {
    console.log('Received paths:', paths);

    window.clearTimeout(noticeTimer.current);
    setNotice(null);
    setShowActions(false);
    incomingRef.current();

    const selection = await actions.load(paths).catch(() => null);

    if (selection) {
      eating.start();
      dropMascotRef.current?.setState({ type: 'eating', kind: selection.type });
      return;
    }

    dropMascotRef.current?.setState({ type: 'confused' });
    setNotice(ACTIONS_TEXTS.rejected);
    noticeTimer.current = window.setTimeout(() => setNotice(null), ACTIONS_TIMING.rejectedTime);
  }, [actions, eating]);

  const dropHandlers = useMemo(
    () => ({
      onEnter : () => {
        setDragging(true);
        incomingRef.current();
      },
      onLeave : () => setDragging(false),
      onDrop  : (paths: string[]) => {
        setDragging(false);
        void handlePaths(paths);
      },
    }),
    [handlePaths],
  );

  useFileDrop(dropHandlers);

  const pickFiles = useCallback(() => {
    void openFileDialog({ type: 'any', multiple: true }).then((paths) => {
      if (paths.length > 0) void handlePaths(paths);
    });
  }, [handlePaths]);

  useEffect(() => {
    if (actions.phase === 'working')  commandAvatar({ type: 'working' });
    if (actions.phase === 'learning') commandAvatar({ type: 'confused' });
  }, [actions.phase, commandAvatar]);

  useEffect(() => () => window.clearTimeout(noticeTimer.current), []);

  return {
    dragging,
    notice,
    selection               : showActions ? actions.selection : null,
    phase                   : actions.phase,
    busy                    : dropState.type === 'eating' || actions.phase === 'working',
    dropMascotRef,
    onDropMascotStateChange : setDropState,
    choose                  : actions.choose,
    close,
    pickFiles,
  };
};
