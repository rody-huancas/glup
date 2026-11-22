import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ACTIONS_TEXTS } from '@/modules/actions/constants/texts';
import { ACTIONS_TIMING } from '@/modules/actions/constants/timing';
import { useActionSelection } from '@/modules/actions/hooks/useActionSelection';
import type { ActionFlow } from '@/modules/actions/interfaces/actionFlow';
import { pickFiles as openFileDialog } from '@/modules/actions/services/fileDialog';
import type { ActionId } from '@/modules/actions/types/actionId';
import { useChewing } from '@/modules/home/hooks/useChewing';
import { useDropZoneGestures } from '@/modules/home/hooks/useDropZoneGestures';
// import { useEatingSequence } from '@/modules/home/hooks/useEatingSequence';
import type { HomeFiles } from '@/modules/home/interfaces/homeFiles';
import type { QuickTool } from '@/modules/home/interfaces/quickTool';
import { IDLE_STATE } from '@/modules/mascot/constants/mascot';
import type { MascotController } from '@/modules/mascot/interfaces/controller';
import type { MascotState } from '@/modules/mascot/types/mascotState';
import { useSaveLocation } from '@/modules/settings/hooks/useSaveLocation';
import { useFileDrop } from '@/shared/hooks/useFileDrop';

interface UseHomeFilesParams {
  commandAvatar   : (state: MascotState) => void;
  onFilesIncoming : () => void;
  onSign          : (path: string) => void;
}

export const useHomeFiles = ({ commandAvatar, onFilesIncoming, onSign }: UseHomeFilesParams): HomeFiles => {
  const [dragging, setDragging]       = useState(false);
  const [notice, setNotice]           = useState<string | null>(null);
  // const [showActions, setShowActions] = useState(false);
  const [dropState, setDropState]     = useState<MascotState>(IDLE_STATE);
  const dropMascotRef                 = useRef<MascotController | null>(null);
  const noticeTimer                   = useRef(0);
  const discardRef                    = useRef<() => void>(() => undefined);
  const incomingRef                   = useRef(onFilesIncoming);
  const pendingAction                 = useRef<ActionId | null>(null);

  useEffect(() => {
    incomingRef.current = onFilesIncoming;
  }, [onFilesIncoming]);

  const onFinished   = useCallback(() => discardRef.current(), []);
  const saveLocation = useSaveLocation();
  const actions      = useActionSelection({ onFinished, destination: saveLocation.destination, bundle: saveLocation.bundleZip, onSign });
  // const eating     = useEatingSequence({ mascotState: dropState, onDone: () => setShowActions(true) });

  useChewing({ mascotRef: dropMascotRef, active: actions.pending !== null });
  useDropZoneGestures({ mascotRef: dropMascotRef, active: !dragging && !actions.selection && !actions.pending });

  const close = useCallback(() => {
    pendingAction.current = null;
    actions.discard();
    setDropState(IDLE_STATE);
  }, [actions]);

  useEffect(() => {
    discardRef.current = close;
  }, [close]);

  const handlePaths = useCallback(async (paths: string[]) => {
    console.log('Received paths:', paths);

    window.clearTimeout(noticeTimer.current);
    setNotice(null);
    incomingRef.current();
    dropMascotRef.current?.setState(IDLE_STATE);

    const { selection, notice: refusal } = await actions.load(paths).catch(() => ({ selection: null, notice: null }));
    // const selection = await actions.load(paths).catch(() => null);

    // The actions show right away; Glup keeps eating in parallel.
    if (selection) {
      dropMascotRef.current?.setState({ type: 'eating', kind: selection.type === 'pdf' || selection.type === 'pdf-mixed' ? 'pdf' : 'image' });
      // dropMascotRef.current?.setState({ type: 'eating', kind: selection.type === 'mixed' ? 'image' : selection.type });
      return;
    }

    pendingAction.current = null;
    dropMascotRef.current?.setState({ type: 'confused' });
    setNotice(refusal ?? ACTIONS_TEXTS.rejected);
    noticeTimer.current = window.setTimeout(() => setNotice(null), ACTIONS_TIMING.rejectedTime);
  }, [actions]);

  const dropHandlers = useMemo(
    () => ({
      onEnter : () => {
        setDragging(true);
        incomingRef.current();
      },
      onLeave : () => setDragging(false),
      onDrop  : (paths: string[]) => {
        setDragging(false);
        pendingAction.current = null;
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

  // Quick tools go through the same flow (Glup eats the files) and then pick their action on their own.
  const runTool = useCallback((tool: QuickTool) => {
    void openFileDialog({ type: tool.fileType, multiple: tool.multiple }).then((paths) => {
      if (paths.length === 0) return;

      pendingAction.current = tool.actionId;
      void handlePaths(paths);
    });
  }, [handlePaths]);

  const choose  = actions.choose;
  const visible = actions.selection;
  // const visible = showActions ? actions.selection : null;

  useEffect(() => {
    const pending = pendingAction.current;
    if (!visible || !pending) return;

    pendingAction.current = null;
    choose(pending);
  }, [visible, choose]);

  // Real runs set Glup's mood from the task store (useTaskMood); here only the "learning" answer.
  useEffect(() => {
    if (actions.phase === 'learning') commandAvatar({ type: 'confused' });
  }, [actions.phase, commandAvatar]);

  // useEffect(() => {
  //   if (actions.phase === 'working')                   commandAvatar({ type: 'working' });
  //   if (actions.phase === 'learning')                  commandAvatar({ type: 'confused' });
  //   if (actions.phase === 'result' && actions.result) commandAvatar(RESULT_MOODS[actions.result.tone]);
  // }, [actions.phase, actions.result, commandAvatar]);

  // useEffect(() => {
  //   if (actions.phase === 'working')  commandAvatar({ type: 'working' });
  //   if (actions.phase === 'learning') commandAvatar({ type: 'confused' });
  // }, [actions.phase, commandAvatar]);

  const flow = useMemo<ActionFlow>(
    () => ({
      phase        : actions.phase,
      saveLocation,
      choose       : actions.choose,
      chooseFormat : actions.chooseFormat,
      merge        : actions.merge,
      splitAll     : actions.splitAll,
      pickPages    : actions.pickPages,
      splitPages   : actions.splitPages,
      toImages     : actions.toImages,
      reducePdf    : actions.reducePdf,
      back         : actions.back,
      close,
    }),
    [actions, saveLocation, close],
  );

  useEffect(() => () => window.clearTimeout(noticeTimer.current), []);

  return {
    dragging,
    notice,
    selection               : visible,
    loading                 : visible ? null : actions.pending,
    slow                    : actions.slow,
    saveLocation,
    phase                   : actions.phase,
    flow,
    // The order list and the page grid keep the island open while the cursor moves around.
    busy                    : dropState.type === 'eating' || ['working', 'order', 'pages'].includes(actions.phase) || actions.pending !== null || saveLocation.picking,
    // busy                    : dropState.type === 'eating' || actions.phase === 'working' || actions.pending !== null || saveLocation.picking,
    // busy                    : dropState.type === 'eating' || actions.phase === 'working',
    dropMascotRef,
    onDropMascotStateChange : setDropState,
    choose                  : actions.choose,
    close,
    pickFiles,
    runTool,
  };
};
