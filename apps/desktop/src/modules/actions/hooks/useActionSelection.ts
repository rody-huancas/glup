import { useCallback, useEffect, useRef, useState } from 'react';
import { LOADING_SLOW_DELAY } from '@/modules/actions/constants/loading';
import { BUNDLE_ACTIONS } from '@/modules/actions/constants/implemented';
import { ACTIONS_TIMING } from '@/modules/actions/constants/timing';
import type { ActionProgress } from '@/modules/actions/interfaces/actionReport';
import type { ActionResult } from '@/modules/actions/interfaces/actionResult';
import type { FileSelection } from '@/modules/actions/interfaces/fileSelection';
import type { PendingSelection } from '@/modules/actions/interfaces/pendingSelection';
import type { RunActionOptions } from '@/modules/actions/interfaces/runAction';
import { openFile, revealFile } from '@/modules/actions/services/files';
import { getFilesInfo } from '@/modules/actions/services/filesInfo';
import { cancelAction, runAction } from '@/modules/actions/services/runAction';
import type { ActionId } from '@/modules/actions/types/actionId';
import type { ActionsPhase } from '@/modules/actions/types/actionsPhase';
import type { ImageFormat } from '@/modules/actions/types/imageFormat';
import { isImplemented } from '@/modules/actions/utils/formats';
import { createPendingSelection } from '@/modules/actions/utils/pending';
import { failedResult, summarizeReport } from '@/modules/actions/utils/result';
import { createSelection } from '@/modules/actions/utils/selection';
import type { SaveDestination } from '@/modules/settings/interfaces/appSettings';
import { ACTION_PROGRESS_EVENT } from '@/shared/constants/events';
import { useTauriEvent } from '@/shared/hooks/useTauriEvent';

interface UseActionSelectionParams {
  onFinished  : () => void;
  destination : SaveDestination;
  bundle      : boolean;
}

export const useActionSelection = ({ onFinished, destination, bundle }: UseActionSelectionParams) => {
  const [selection, setSelection]   = useState<FileSelection | null>(null);
  const [pending, setPending]       = useState<PendingSelection | null>(null);
  const [slow, setSlow]             = useState(false);
  const [phase, setPhase]           = useState<ActionsPhase>('choosing');
  const [progress, setProgress]     = useState<ActionProgress | null>(null);
  const [result, setResult]         = useState<ActionResult | null>(null);
  const [running, setRunning]       = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const timers                      = useRef<number[]>([]);
  const finishedRef                 = useRef(onFinished);
  const destinationRef              = useRef(destination);
  const bundleRef                   = useRef(bundle);
  const runId                       = useRef(0);

  useEffect(() => {
    finishedRef.current    = onFinished;
    destinationRef.current = destination;
    bundleRef.current      = bundle;
  }, [onFinished, destination, bundle]);

  useTauriEvent<ActionProgress>(ACTION_PROGRESS_EVENT, setProgress);

  const clearTimers = useCallback(() => {
    timers.current.forEach((timer) => window.clearTimeout(timer));
    timers.current = [];
  }, []);

  const schedule = useCallback((callback: () => void, delay: number) => {
    timers.current.push(window.setTimeout(callback, delay));
  }, []);

  // The count and the skeleton show at once; the real selection replaces them when Rust answers.
  const load = useCallback(async (paths: string[]): Promise<FileSelection | null> => {
    clearTimers();

    const ticket  = runId.current + 1;
    runId.current = ticket;

    setSelection(null);
    setResult(null);
    setPhase('choosing');
    setPending(createPendingSelection(paths));
    setSlow(false);

    const slowTimer = window.setTimeout(() => setSlow(true), LOADING_SLOW_DELAY);

    try {
      const files = await getFilesInfo(paths);
      if (ticket !== runId.current) return null;

      const next = createSelection({ paths, files });
      setSelection(next);
      return next;
    } finally {
      window.clearTimeout(slowTimer);

      if (ticket === runId.current) {
        setPending(null);
        setSlow(false);
      }
    }
  }, [clearTimers]);

  // const load = useCallback(async (paths: string[]): Promise<FileSelection | null> => {
  //   clearTimers();
  //   runId.current += 1;
  //
  //   const files = await getFilesInfo(paths);
  //   const next  = createSelection({ paths, files });
  //
  //   setSelection(next);
  //   setPhase('choosing');
  //   setResult(null);
  //   return next;
  // }, [clearTimers]);

  // Actions not built yet keep the old answer: working for a moment, then "Esto lo aprendo pronto".
  const learn = useCallback(() => {
    setPhase('working');

    schedule(() => {
      setPhase('learning');
      schedule(() => finishedRef.current(), ACTIONS_TIMING.learningTime);
    }, ACTIONS_TIMING.workingTime);
  }, [schedule]);

  // A newer load or a discard invalidates the run, so a late result never shows up on a fresh panel.
  const execute = useCallback(async (actionId: ActionId, options?: RunActionOptions) => {
    if (!selection) return;

    const ticket = runId.current + 1;
    runId.current = ticket;

    setPhase('working');
    setProgress(null);
    setResult(null);
    setRunning(true);
    setCancelling(false);

    const delivery = { destination: destinationRef.current, bundle: bundleRef.current && BUNDLE_ACTIONS.includes(actionId) };

    const next = await runAction({ actionId, paths: selection.paths, options: { ...options, ...delivery } })
      .then(summarizeReport)
      .catch((error: unknown) => failedResult(String(error)));

    if (ticket !== runId.current) return;

    setRunning(false);
    setCancelling(false);
    setResult(next);
    setPhase('result');
  }, [selection]);

  const choose = useCallback((actionId: ActionId) => {
    if (!selection || phase !== 'choosing') return;
    if (!isImplemented(selection, actionId)) return learn();
    if (actionId === 'convert') return setPhase('formats');

    void execute(actionId);
  }, [selection, phase, learn, execute]);

  // const choose = useCallback((actionId: ActionId) => {
  //   if (!selection || phase !== 'choosing') return;
  //
  //   void runAction({ actionId, paths: selection.paths });
  //   setPhase('working');
  //
  //   schedule(() => {
  //     setPhase('learning');
  //     schedule(() => finishedRef.current(), ACTIONS_TIMING.learningTime);
  //   }, ACTIONS_TIMING.workingTime);
  // }, [selection, phase, schedule]);

  const chooseFormat = useCallback((format: ImageFormat) => {
    if (phase === 'formats') void execute('convert', { format });
  }, [phase, execute]);

  const back = useCallback(() => {
    if (phase === 'formats') setPhase('choosing');
  }, [phase]);

  const cancel = useCallback(() => {
    if (!running || cancelling) return;

    setCancelling(true);
    void cancelAction();
  }, [running, cancelling]);

  const openOutput = useCallback(() => {
    if (result?.openPath) void openFile(result.openPath);
  }, [result]);

  const revealOutput = useCallback(() => {
    if (result?.revealPath) void revealFile(result.revealPath);
  }, [result]);

  const discard = useCallback(() => {
    clearTimers();
    runId.current += 1;
    setSelection(null);
    setPending(null);
    setSlow(false);
    setPhase('choosing');
    setProgress(null);
    setResult(null);
    setRunning(false);
    setCancelling(false);
  }, [clearTimers]);

  useEffect(() => clearTimers, [clearTimers]);

  return {
    selection,
    pending,
    slow,
    phase,
    progress,
    result,
    running,
    cancelling,
    load,
    choose,
    chooseFormat,
    back,
    cancel,
    openOutput,
    revealOutput,
    discard,
  };
};
