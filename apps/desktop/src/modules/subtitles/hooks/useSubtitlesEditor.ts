import { useCallback, useState } from 'react';
import { LEARNABLES } from '@/modules/background/constants/learnables';
import { withLearning } from '@/modules/background/utils/learnChain';
import type { TrimTarget } from '@/modules/media/interfaces/trimTarget';
import type { SaveDestination } from '@/modules/settings/interfaces/appSettings';
import { SUBTITLES_TEXTS } from '@/modules/subtitles/constants/texts';
import type { Cue } from '@/modules/subtitles/interfaces/cue';
import { listenSubtitles, saveVideoSubtitles } from '@/modules/subtitles/services/subtitles';
import type { SubtitleMode } from '@/modules/subtitles/types/subtitleMode';
import { editCue, mergeCues, removeCue, retimeCue, splitCue } from '@/modules/subtitles/utils/cues';
import type { TaskSpec } from '@/modules/tasks/interfaces/taskSpec';
import { cancelTask, enqueueTask } from '@/modules/tasks/store/taskStore';
import { summaryToResult } from '@/modules/tasks/utils/taskResult';
import type { TranscribeOptions } from '@/modules/transcribe/interfaces/transcribeOptions';

type Stage = 'setup' | 'learning' | 'listening' | 'review' | 'failed';

interface SubtitlesEditorParams {
  target : TrimTarget;
  onExit : () => void;
}

// "Subtítulos": the language and level, the model asked for the first time, the video heard as a task
// (the mascot works and Cancelar stops it), the phrases to review and saving them as another task.
export const useSubtitlesEditor = ({ target, onExit }: SubtitlesEditorParams) => {
  const [stage, setStage]       = useState<Stage>('setup');
  const [taskId, setTaskId]     = useState<string | null>(null);
  const [options, setOptions]   = useState<TranscribeOptions | null>(null);
  const [cues, setCues]         = useState<Cue[]>([]);
  const [error, setError]       = useState<string | null>(null);
  const [changed, setChanged]   = useState(false);
  const [mode, setMode]         = useState<SubtitleMode>('file');
  const [background, setBackground] = useState(false);

  const run = useCallback((chosen: TranscribeOptions): TaskSpec['run'] => async (context) => {
    try {
      const draft = await listenSubtitles({ path: target.path, options: chosen, taskId: context.taskId });
      if (draft.cancelled) {
        setStage('setup');
        return summaryToResult({ tone: 'calm', message: '', note: null });
      }
      setCues(draft.cues);
      setStage('review');
      return summaryToResult({ tone: 'success', message: SUBTITLES_TEXTS.heard, note: null });
    } catch (failure) {
      setError(String(failure));
      setStage('failed');
      throw failure;
    }
  }, [target.path]);

  const queue = useCallback((chosen: TranscribeOptions, learn: boolean) => {
    const learnable = LEARNABLES[chosen.level === 'fast' ? 'transcribe-fast' : 'transcribe-precise'];
    const listen    = run(chosen);
    setStage('listening');
    setTaskId(enqueueTask({
      title     : SUBTITLES_TEXTS.listenTask(target.name),
      actionId  : 'subtitles',
      type      : 'video',
      fileCount : 1,
      owner     : 'home',
      run       : learn ? withLearning({ learnable, run: listen }) : listen,
    }));
  }, [run, target.name]);

  // «Escuchar»: right away when the level is learned; otherwise Glup asks first (with the size).
  const listen = useCallback((chosen: TranscribeOptions) => {
    setOptions(chosen);
    setError(null);
    const learnable = LEARNABLES[chosen.level === 'fast' ? 'transcribe-fast' : 'transcribe-precise'];
    void learnable
      .getStatus()
      .then((status) => status.installed)
      .catch(() => false)
      .then((installed) => (installed ? queue(chosen, false) : setStage('learning')));
  }, [queue]);

  // Only once, from the step that asked.
  const acceptLearning = useCallback(() => {
    if (options && stage === 'learning') queue(options, true);
  }, [options, stage, queue]);

  // Leaving while it listens stops the listening (nobody would review it).
  const leave = useCallback(() => {
    if (stage === 'listening' && taskId) cancelTask(taskId);
    onExit();
  }, [stage, taskId, onExit]);

  const change = useCallback((next: (current: Cue[]) => Cue[]) => {
    setChanged(true);
    setCues(next);
  }, []);

  const editor = {
    edit   : (index: number, text: string) => change((current) => editCue(current, index, text)),
    merge  : (index: number) => change((current) => mergeCues(current, index)),
    split  : (index: number, at?: number) => change((current) => splitCue(current, index, at)),
    remove : (index: number) => change((current) => removeCue(current, index)),
    retime : (index: number, which: 'start' | 'end', ms: number, duration: number) => change((current) => retimeCue({ cues: current, index, which, ms, duration })),
  };

  const save = useCallback((destination: SaveDestination) => {
    const kept     = cues.filter((cue) => cue.text.trim() !== '');
    const language = options?.language ?? null;
    enqueueTask({
      title     : SUBTITLES_TEXTS.saveTask(target.name),
      actionId  : 'save-subtitles',
      type      : 'video',
      fileCount : 1,
      owner     : 'home',
      run       : ({ taskId: id }) => saveVideoSubtitles({ path: target.path, cues: kept, mode, background: mode === 'burn' && background, language, destination, taskId: id }),
    });
    onExit();
  }, [cues, options, target, mode, background, onExit]);

  return {
    stage, setStage, taskId, options, listen, acceptLearning, error, cues, changed: changed || stage === 'listening',
    editor, mode, setMode, background, setBackground, save, leave,
  };
};
