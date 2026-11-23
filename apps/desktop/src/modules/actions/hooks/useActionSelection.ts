import { useCallback, useEffect, useRef, useState } from 'react';
import { LOADING_SLOW_DELAY } from '@/modules/actions/constants/loading';
import { ACTIONS_TIMING } from '@/modules/actions/constants/timing';
import type { FileSelection } from '@/modules/actions/interfaces/fileSelection';
import type { LoadResult } from '@/modules/actions/interfaces/loadResult';
import type { PendingSelection } from '@/modules/actions/interfaces/pendingSelection';
import type { RunActionOptions } from '@/modules/actions/interfaces/runAction';
import { getFilesInfo } from '@/modules/actions/services/filesInfo';
import { runAction } from '@/modules/actions/services/runAction';
import type { ActionId } from '@/modules/actions/types/actionId';
import type { ActionsPhase } from '@/modules/actions/types/actionsPhase';
import type { ImageFormat } from '@/modules/actions/types/imageFormat';
import { isImplemented, usesBundle } from '@/modules/actions/utils/formats';
import { createPendingSelection } from '@/modules/actions/utils/pending';
import { createSelection } from '@/modules/actions/utils/selection';
import { getSelectionSummary } from '@/modules/actions/utils/summary';
import { getBackgroundModel } from '@/modules/background/services/backgroundModel';
import type { BackgroundKind } from '@/modules/background/types/backgroundKind';
import { nextLearnPhase } from '@/modules/background/utils/learnStep';
import { PDF_TEXTS } from '@/modules/pdf/constants/pdf';
import type { NumberingOptions } from '@/modules/pdf/interfaces/numberingOptions';
import type { ReduceOptions } from '@/modules/pdf/interfaces/reduceOptions';
import type { WatermarkOptions } from '@/modules/pdf/interfaces/watermarkOptions';
import { exportPdfPages } from '@/modules/pdf/services/pageImages';
import { checkPdfPassword } from '@/modules/pdf/services/password';
import type { PageImageFormat } from '@/modules/pdf/types/pageImageFormat';
import type { SaveDestination } from '@/modules/settings/interfaces/appSettings';
import type { TaskSpec } from '@/modules/tasks/interfaces/taskSpec';
import { enqueueTask } from '@/modules/tasks/store/taskStore';
import { extractText } from '@/modules/text/services/extractText';
import type { VideoOptions } from '@/modules/video/interfaces/videoOptions';
import { getVideoTool } from '@/modules/video/services/videoTool';

interface UseActionSelectionParams {
  onFinished  : () => void;
  destination : SaveDestination;
  bundle      : boolean;
  // "Firmar" opens the signing screen with this PDF.
  onSign      : (path: string) => void;
  // "Organizar páginas" opens its own screen too.
  onOrganize  : (path: string) => void;
}

interface ExecuteParams {
  actionId : ActionId;
  options? : RunActionOptions;
  // The merge order, when it differs from the drop order.
  paths?   : string[];
}

// Actions that open a second step before running.
const ACTION_STEPS: Partial<Record<ActionId, ActionsPhase>> = {
  convert       : 'formats',
  merge         : 'order',
  'split-pages' : 'split',
  'to-images'   : 'image-format',
  protect        : 'protect',
  unlock         : 'unlock',
  watermark      : 'watermark',
  'page-numbers' : 'numbering',
};

// Where "Volver" goes from each step.
const BACK_STEPS: Partial<Record<ActionsPhase, ActionsPhase>> = {
  formats          : 'choosing',
  order            : 'choosing',
  split            : 'choosing',
  'image-format'   : 'choosing',
  reduce           : 'choosing',
  pages            : 'split',
  'learn-model'    : 'choosing',
  // The download goes on as a task; only the step is left.
  'learning-model' : 'choosing',
  background       : 'choosing',
  video            : 'choosing',
  protect          : 'choosing',
  unlock           : 'choosing',
  watermark        : 'choosing',
  numbering        : 'choosing',
};

// Choosing what to do with the dropped files. Running it is handed to the task store, which outlives the
// panel: the selection is cleared right away and the task shows its progress and result on its own.
export const useActionSelection = ({ onFinished, destination, bundle, onSign, onOrganize }: UseActionSelectionParams) => {
// export const useActionSelection = ({ onFinished, destination, bundle, onSign }: UseActionSelectionParams) => {
  const [selection, setSelection] = useState<FileSelection | null>(null);
  const [pending, setPending]     = useState<PendingSelection | null>(null);
  const [slow, setSlow]           = useState(false);
  const [phase, setPhase]         = useState<ActionsPhase>('choosing');
  const timers                    = useRef<number[]>([]);
  const finishedRef               = useRef(onFinished);
  const destinationRef            = useRef(destination);
  const bundleRef                 = useRef(bundle);
  const signRef                   = useRef(onSign);
  const organizeRef               = useRef(onOrganize);
  const loadId                    = useRef(0);
  // The step after learning: the background choice, or what the video is for.
  const learnDone                 = useRef<ActionsPhase>('background');

  useEffect(() => {
    finishedRef.current    = onFinished;
    destinationRef.current = destination;
    bundleRef.current      = bundle;
    signRef.current        = onSign;
    organizeRef.current    = onOrganize;
  }, [onFinished, destination, bundle, onSign, onOrganize]);
  // }, [onFinished, destination, bundle, onSign]);

  const clearTimers = useCallback(() => {
    timers.current.forEach((timer) => window.clearTimeout(timer));
    timers.current = [];
  }, []);

  const schedule = useCallback((callback: () => void, delay: number) => {
    timers.current.push(window.setTimeout(callback, delay));
  }, []);

  // The count and the skeleton show at once; the real selection replaces them when Rust answers.
  // A PDF with a password is refused with its own notice.
  const load = useCallback(async (paths: string[]): Promise<LoadResult> => {
    clearTimers();

    const ticket   = loadId.current + 1;
    loadId.current = ticket;

    setSelection(null);
    setPhase('choosing');
    setPending(createPendingSelection(paths));
    setSlow(false);

    const slowTimer = window.setTimeout(() => setSlow(true), LOADING_SLOW_DELAY);

    try {
      const files = await getFilesInfo(paths);
      if (ticket !== loadId.current) return { selection: null, notice: null };

      // One PDF with a password only offers "Quitar contraseña"; with other files it is refused.
      if (files.length > 1 && files.some((file) => file.protected)) return { selection: null, notice: PDF_TEXTS.password };
      // if (files.some((file) => file.protected)) return { selection: null, notice: PDF_TEXTS.password };

      const next = createSelection({ paths, files });
      setSelection(next);
      return { selection: next, notice: null };
    } finally {
      window.clearTimeout(slowTimer);

      if (ticket === loadId.current) {
        setPending(null);
        setSlow(false);
      }
    }
  }, [clearTimers]);

  // Actions not built yet keep the old answer: working for a moment, then "Esto lo aprendo pronto".
  const learn = useCallback(() => {
    setPhase('working');

    schedule(() => {
      setPhase('learning');
      schedule(() => finishedRef.current(), ACTIONS_TIMING.learningTime);
    }, ACTIONS_TIMING.workingTime);
  }, [schedule]);

  // "Reducir peso · contrato.pdf", with the selection's icon.
  const describe = useCallback((actionId: ActionId, current: FileSelection): Omit<TaskSpec, 'run'> => {
    const label = current.actions.find((action) => action.id === actionId)?.label ?? '';

    return { title: `${label} · ${getSelectionSummary(current).label}`, type: current.type, fileCount: current.files.length, owner: 'home' };
  }, []);

  // Queued in the task store (one at a time); the selection is done and the panel shows the task.
  const enqueue = useCallback((actionId: ActionId, run: TaskSpec['run']) => {
    if (!selection) return;

    enqueueTask({ ...describe(actionId, selection), run });
    finishedRef.current();
  }, [selection, describe]);

  const execute = useCallback(({ actionId, options, paths }: ExecuteParams) => {
    if (!selection) return;

    const delivery = { destination: destinationRef.current, bundle: bundleRef.current && usesBundle(actionId) };
    const files    = paths ?? selection.paths;

    enqueue(actionId, ({ taskId }) => runAction({ actionId, paths: files, options: { ...options, ...delivery }, taskId }));
  }, [selection, enqueue]);

  const choose = useCallback((actionId: ActionId) => {
    if (!selection || phase !== 'choosing') return;
    if (!isImplemented(selection, actionId)) return learn();

    // The signing screen takes over the panel; the selection is done.
    if (actionId === 'sign') {
      signRef.current(selection.paths[0]);
      finishedRef.current();
      return;
    }

    // "Sacar texto" goes page by page in the webview (pdf.js) and Rust (the OCR of Windows).
    if (actionId === 'extract-text') {
      const files       = selection.files;
      const destination = destinationRef.current;
      return enqueue('extract-text', ({ onProgress, isCancelled }) => extractText({ files, destination, onProgress, isCancelled }));
    }

    // So does the organizing screen.
    if (actionId === 'organize-pages') {
      organizeRef.current(selection.paths[0]);
      finishedRef.current();
      return;
    }

    // "Reducir peso" asks for a level only with PDFs.
    if (actionId === 'compress' && selection.type === 'pdf') return setPhase('reduce');

    // With videos it asks what they are for; the first time, Glup has to learn (download FFmpeg).
    if (actionId === 'compress' && selection.type === 'video') {
      learnDone.current = 'video';
      void getVideoTool()
        .then((status) => setPhase((current) => nextLearnPhase(current, status.installed ? 'installed' : 'missing', 'video')))
        .catch(() => setPhase((current) => nextLearnPhase(current, 'missing', 'video')));
      return;
    }

    // "Quitar fondo" asks for permission to download what it needs the first time.
    if (actionId === 'remove-background') {
      learnDone.current = 'background';
      void getBackgroundModel()
        .then((status) => setPhase((current) => nextLearnPhase(current, status.installed ? 'installed' : 'missing')))
        .catch(() => setPhase((current) => nextLearnPhase(current, 'missing')));
      return;
    }

    const step = ACTION_STEPS[actionId];
    if (step) return setPhase(step);

    execute({ actionId });
  }, [selection, phase, learn, execute, enqueue]);

  const chooseFormat = useCallback((format: ImageFormat) => {
    if (phase === 'formats') execute({ actionId: 'convert', options: { format } });
  }, [phase, execute]);

  const chooseBackground = useCallback((background: BackgroundKind) => {
    if (phase === 'background') execute({ actionId: 'remove-background', options: { background } });
  }, [phase, execute]);

  // The learning step: downloading, back to the question (cancelled or failed), or ready.
  const modelStarted = useCallback(() => setPhase((current) => nextLearnPhase(current, 'started', learnDone.current)), []);
  const modelStopped = useCallback(() => setPhase((current) => nextLearnPhase(current, 'stopped', learnDone.current)), []);
  const modelReady   = useCallback(() => setPhase((current) => nextLearnPhase(current, 'ready', learnDone.current)), []);
  // const modelStarted = useCallback(() => setPhase((current) => nextLearnPhase(current, 'started')), []);
  // const modelStopped = useCallback(() => setPhase((current) => nextLearnPhase(current, 'stopped')), []);
  // const modelReady   = useCallback(() => setPhase((current) => nextLearnPhase(current, 'ready')), []);

  const merge = useCallback((paths: string[]) => {
    if (phase === 'order') execute({ actionId: 'merge', paths });
  }, [phase, execute]);

  const splitAll = useCallback(() => {
    if (phase === 'split') execute({ actionId: 'split-pages', options: { split: { mode: 'all', pages: [] } } });
  }, [phase, execute]);

  const pickPages = useCallback(() => {
    if (phase === 'split') setPhase('pages');
  }, [phase]);

  const splitPages = useCallback((pages: number[]) => {
    if (phase === 'pages' && pages.length > 0) execute({ actionId: 'split-pages', options: { split: { mode: 'select', pages } } });
  }, [phase, execute]);

  // pdf.js renders the pages in the webview; Rust writes them (see exportPdfPages).
  const toImages = useCallback((format: PageImageFormat) => {
    if (!selection || phase !== 'image-format') return;

    const path        = selection.paths[0];
    const destination = destinationRef.current;
    const bundled     = bundleRef.current;

    enqueue('to-images', ({ taskId, onProgress, isCancelled }) =>
      exportPdfPages({ path, format, destination, bundle: bundled, onProgress, isCancelled, taskId }),
    );
  }, [selection, phase, enqueue]);

  const reducePdf = useCallback((reduce: ReduceOptions) => {
    if (phase === 'reduce') execute({ actionId: 'compress', options: { reduce } });
  }, [phase, execute]);

  // The password goes straight to the task; it is not kept anywhere else.
  const protectPdf = useCallback((password: string) => {
    if (phase === 'protect') execute({ actionId: 'protect', options: { password } });
  }, [phase, execute]);

  // Checked first, so a wrong password can be typed again in the same step.
  const unlockPdf = useCallback(async (password: string): Promise<boolean> => {
    if (!selection || phase !== 'unlock') return false;

    const right = await checkPdfPassword({ path: selection.paths[0], password });
    if (right) execute({ actionId: 'unlock', options: { password } });
    return right;
  }, [selection, phase, execute]);

  const watermarkPdf = useCallback((watermark: WatermarkOptions) => {
    if (phase === 'watermark') execute({ actionId: 'watermark', options: { watermark } });
  }, [phase, execute]);

  const numberPages = useCallback((numbering: NumberingOptions) => {
    if (phase === 'numbering') execute({ actionId: 'page-numbers', options: { numbering } });
  }, [phase, execute]);

  const reduceVideo = useCallback((video: VideoOptions) => {
    if (phase === 'video') execute({ actionId: 'compress', options: { video } });
  }, [phase, execute]);

  const back = useCallback(() => {
    const previous = BACK_STEPS[phase];
    if (previous) setPhase(previous);
  }, [phase]);

  // Only the selection is dropped; tasks already queued or running are not touched.
  const discard = useCallback(() => {
    clearTimers();
    loadId.current += 1;
    setSelection(null);
    setPending(null);
    setSlow(false);
    setPhase('choosing');
  }, [clearTimers]);

  useEffect(() => clearTimers, [clearTimers]);

  return {
    selection,
    pending,
    slow,
    phase,
    load,
    choose,
    chooseFormat,
    merge,
    splitAll,
    pickPages,
    splitPages,
    toImages,
    reducePdf,
    protectPdf,
    unlockPdf,
    watermarkPdf,
    numberPages,
    reduceVideo,
    chooseBackground,
    modelStarted,
    modelStopped,
    modelReady,
    back,
    discard,
  };
};

// The previous version also ran the action and kept its progress and result here, so collapsing the
// island (which discards the selection) lost them; see git history before the tasks module.
