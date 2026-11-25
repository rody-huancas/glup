import { useCallback, useEffect, useState } from 'react';
import { STRIP_FRAMES, TRIM_TEXTS, WAVE_BARS } from '@/modules/media/constants/texts';
import { useMediaSource } from '@/modules/media/hooks/useMediaSource';
import type { TrimTarget } from '@/modules/media/interfaces/trimTarget';
import { getMediaKeyframes, getMediaStrip, getMediaWave, trimMedia } from '@/modules/media/services/media';
import type { TrimMode } from '@/modules/media/types/trimMode';
import { SUGGESTED_SECONDS } from '@/modules/media/utils/animation';
import { keyframeBefore, moveEdge } from '@/modules/media/utils/time';
import type { Stretch } from '@/modules/media/utils/time';
import type { SaveDestination } from '@/modules/settings/interfaces/appSettings';
import { enqueueTask } from '@/modules/tasks/store/taskStore';
import { getVideoTool } from '@/modules/video/services/videoTool';

interface TrimEditorParams {
  target : TrimTarget;
  onExit : () => void;
}

// The trimming screen: FFmpeg learned (or asked for), the file opened, the strip of frames or the
// shape of the sound, the stretch, the mode and saving the cut as a task.
export const useTrimEditor = ({ target, onExit }: TrimEditorParams) => {
  const [learned, setLearned]     = useState<boolean | null>(null);
  const [stretch, setStretch]     = useState<Stretch>({ start: 0, end: 0 });
  const [mode, setMode]           = useState<TrimMode>('fast');
  const [keyframes, setKeyframes] = useState<number[] | null>(null);
  const [strip, setStrip]         = useState<string | null>(null);
  const [wave, setWave]           = useState<number[] | null>(null);
  const [changed, setChanged]     = useState(false);
  const source                    = useMediaSource({ path: target.path, enabled: learned === true });
  const { info }                  = source;

  useEffect(() => {
    void getVideoTool()
      .then((tool) => setLearned(tool.installed))
      .catch(() => setLearned(false));
  }, []);

  // The whole file to cut; a GIF starts with its first 15 seconds.
  useEffect(() => {
    if (!info) return;
    setStretch({ start: 0, end: target.purpose === 'gif' ? Math.min(info.duration, SUGGESTED_SECONDS) : info.duration });
    if (info.hasVideo) {
      void getMediaStrip({ path: target.path, count: STRIP_FRAMES }).then(setStrip).catch(() => undefined);
      void getMediaKeyframes(target.path).then(setKeyframes).catch(() => setKeyframes([]));
    } else {
      void getMediaWave({ path: target.path, bars: WAVE_BARS }).then(setWave).catch(() => undefined);
    }
  }, [info, target.path, target.purpose]);

  useEffect(() => () => {
    if (strip) URL.revokeObjectURL(strip);
  }, [strip]);

  const move = useCallback((which: 'start' | 'end', to: number) => {
    if (!info) return;
    setChanged(true);
    setStretch((current) => moveEdge({ stretch: current, which, to, duration: info.duration }));
  }, [info]);

  const realStart = info?.hasVideo && mode === 'fast' && keyframes ? keyframeBefore(keyframes, stretch.start) : stretch.start;

  const save = useCallback((destination: SaveDestination) => {
    if (!info) return;
    const { start, end } = stretch;
    enqueueTask({
      title     : TRIM_TEXTS.taskTitle(target.name),
      actionId  : 'trim',
      type      : info.hasVideo ? 'video' : 'audio',
      fileCount : 1,
      owner     : 'home',
      run       : ({ taskId }) => trimMedia({ path: target.path, start, end, mode, destination, taskId }),
    });
    onExit();
  }, [info, stretch, mode, target, onExit]);

  const status = learned === false ? 'learning' : learned === null || source.status === 'idle' ? 'opening' : source.status;

  return { status, info, url: source.url, playerFailed: source.playerFailed, learned: () => setLearned(true), stretch, move, mode, setMode, keyframes, realStart, strip, wave, changed, save };
};
