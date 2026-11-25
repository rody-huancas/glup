import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ACTIONS_TEXTS } from '@/modules/actions/constants/texts';
import { ACTIONS_TIMING } from '@/modules/actions/constants/timing';
import { useActionSelection } from '@/modules/actions/hooks/useActionSelection';
import type { ActionFlow } from '@/modules/actions/interfaces/actionFlow';
import { pickFiles as openFileDialog } from '@/modules/actions/services/fileDialog';
import type { ActionId } from '@/modules/actions/types/actionId';
import type { ActionsPhase } from '@/modules/actions/types/actionsPhase';
import type { DialogFileType } from '@/modules/actions/types/fileType';
import { useChewing } from '@/modules/home/hooks/useChewing';
import { useDropZoneGestures } from '@/modules/home/hooks/useDropZoneGestures';
import type { HomeFiles } from '@/modules/home/interfaces/homeFiles';
import { holdWhile } from '@/modules/island/store/islandHolds';
import { IDLE_STATE } from '@/modules/mascot/constants/mascot';
import type { MascotController } from '@/modules/mascot/interfaces/controller';
import type { MascotState } from '@/modules/mascot/types/mascotState';
import { useSaveLocation } from '@/modules/settings/hooks/useSaveLocation';
import type { ActionTool } from '@/modules/tools/interfaces/actionTool';
import { useFileDrop } from '@/shared/hooks/useFileDrop';

// Steps with a list, a grid or a choice: the person is in the middle of them.
// Not while downloading what "Quitar fondo" needs: that runs as a task and the island may collapse.
const STEP_PHASES: ActionsPhase[] = ['formats', 'order', 'split', 'pages', 'image-format', 'reduce', 'learn-model', 'background', 'protect', 'unlock', 'watermark', 'numbering', 'video', 'id-format', 'id-preview', 'transcribe'];

interface UseHomeFilesParams {
  commandAvatar   : (state: MascotState) => void;
  onFilesIncoming : () => void;
  onSign          : (path: string) => void;
  onOrganize      : (path: string) => void;
}

export const useHomeFiles = ({ commandAvatar, onFilesIncoming, onSign, onOrganize }: UseHomeFilesParams): HomeFiles => {
  const [dragging, setDragging]       = useState(false);
  const [notice, setNotice]           = useState<string | null>(null);
  // Glup eating no longer keeps the island open, so only the setter is used.
  const [, setDropState]              = useState<MascotState>(IDLE_STATE);
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
  const actions      = useActionSelection({ onFinished, destination: saveLocation.destination, bundle: saveLocation.bundleZip, onSign, onOrganize });

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

    // The actions show right away; Glup keeps eating in parallel.
    if (selection) {
      dropMascotRef.current?.setState({ type: 'eating', kind: ['pdf', 'pdf-mixed', 'pdf-locked'].includes(selection.type) ? 'pdf' : 'image' });
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

  const pickFilesOf = useCallback((type: DialogFileType) => {
    void holdWhile(() => openFileDialog({ type, multiple: true })).then((paths) => {
      if (paths.length > 0) void handlePaths(paths);
    });
  }, [handlePaths]);

  const pickFiles = useCallback(() => pickFilesOf('any'), [pickFilesOf]);

  // Tools go through the same flow (Glup eats the files) and then pick their action on their own.
  // Resolves true once files were chosen, so Herramientas can bring the person to Inicio.
  const runTool = useCallback(async (tool: ActionTool): Promise<boolean> => {
    const paths = await holdWhile(() => openFileDialog({ type: tool.fileType, multiple: tool.multiple }));
    if (paths.length === 0) return false;

    pendingAction.current = tool.actionId;
    void handlePaths(paths);
    return true;
  }, [handlePaths]);

  const choose  = actions.choose;
  const visible = actions.selection;

  useEffect(() => {
    const pending = pendingAction.current;
    if (!visible || !pending) return;

    pendingAction.current = null;
    // Files that do not fit the tool (one PDF for "Unir") just show what can be done with them, like a drop.
    if (visible.actions.some((action) => action.id === pending)) choose(pending);
  }, [visible, choose]);

  // Real runs set Glup's mood from the task store (useTaskMood); here only the "learning" answer.
  useEffect(() => {
    if (actions.phase === 'learning') commandAvatar({ type: 'confused' });
  }, [actions.phase, commandAvatar]);

  const flow = useMemo<ActionFlow>(
    () => ({
      phase            : actions.phase,
      saveLocation,
      choose           : actions.choose,
      chooseFormat     : actions.chooseFormat,
      chooseJpgQuality : actions.chooseJpgQuality,
      merge            : actions.merge,
      splitAll         : actions.splitAll,
      pickPages        : actions.pickPages,
      splitPages       : actions.splitPages,
      toImages         : actions.toImages,
      reducePdf        : actions.reducePdf,
      chooseBackground : actions.chooseBackground,
      protectPdf       : actions.protectPdf,
      unlockPdf        : actions.unlockPdf,
      watermarkPdf     : actions.watermarkPdf,
      numberPages      : actions.numberPages,
      reduceVideo      : actions.reduceVideo,
      idChoice         : actions.idChoice,
      chooseIdFormat   : actions.chooseIdFormat,
      saveIdPhoto      : actions.saveIdPhoto,
      startTranscribe  : actions.startTranscribe,
      learnable        : actions.learnable,
      chained          : actions.chained,
      acceptLearning   : actions.acceptLearning,
      modelStarted     : actions.modelStarted,
      modelStopped     : actions.modelStopped,
      modelReady       : actions.modelReady,
      back             : actions.back,
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
    // Needs the person: a step with a list or a choice, or the folder picker. Glup eating or working no longer holds it.
    busy                    : STEP_PHASES.includes(actions.phase) || saveLocation.picking,
    dropMascotRef,
    onDropMascotStateChange : setDropState,
    choose                  : actions.choose,
    close,
    pickFiles,
    pickFilesOf,
    runTool,
  };
};
