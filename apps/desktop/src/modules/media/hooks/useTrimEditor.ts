import { useCallback, useEffect, useRef, useState } from 'react';
import { STRIP_FRAMES, TRIM_TEXTS, WAVE_BARS } from '@/modules/media/constants/texts';
import type { TrimTarget } from '@/modules/media/interfaces/trimTarget';
import type { MediaInfo } from '@/modules/media/interfaces/mediaInfo';
import { closeMedia, getMediaKeyframes, getMediaStrip, getMediaWave, makeMediaPreview, openMedia, trimMedia } from '@/modules/media/services/media';
import type { TrimMode } from '@/modules/media/types/trimMode';
import { keyframeBefore, moveEdge } from '@/modules/media/utils/time';
import type { Stretch } from '@/modules/media/utils/time';
import type { SaveDestination } from '@/modules/settings/interfaces/appSettings';
import { enqueueTask } from '@/modules/tasks/store/taskStore';
import { getVideoTool } from '@/modules/video/services/videoTool';

type Status = 'learning' | 'opening' | 'previewing' | 'ready' | 'failed';

interface TrimEditorParams {
  target : TrimTarget;
  onExit : () => void;
}

// The trimming screen: FFmpeg learned (or asked for), the file opened (or its light copy made), the
// strip of frames or the shape of the sound, the stretch, the mode and saving it as a task.
export const useTrimEditor = ({ target, onExit }: TrimEditorParams) => {
  const [status, setStatus]       = useState<Status>('opening');
  const [info, setInfo]           = useState<MediaInfo | null>(null);
  const [url, setUrl]             = useState<string | null>(null);
  const [stretch, setStretch]     = useState<Stretch>({ start: 0, end: 0 });
  const [mode, setMode]           = useState<TrimMode>('fast');
  const [keyframes, setKeyframes] = useState<number[] | null>(null);
  const [strip, setStrip]         = useState<string | null>(null);
  const [wave, setWave]           = useState<number[] | null>(null);
  const [changed, setChanged]     = useState(false);
  const previewed                 = useRef(false);

  const open = useCallback(() => {
    setStatus('opening');
    void openMedia(target.path)
      .then(async (opened) => {
        setInfo(opened.info);
        setStretch({ start: 0, end: opened.info.duration });
        if (opened.url) {
          setUrl(opened.url);
          setStatus('ready');
        } else {
          previewed.current = true;
          setStatus('previewing');
          setUrl(await makeMediaPreview(target.path));
          setStatus('ready');
        }
        if (opened.info.hasVideo) {
          void getMediaStrip({ path: target.path, count: STRIP_FRAMES }).then(setStrip).catch(() => undefined);
          void getMediaKeyframes(target.path).then(setKeyframes).catch(() => setKeyframes([]));
        } else {
          void getMediaWave({ path: target.path, bars: WAVE_BARS }).then(setWave).catch(() => undefined);
        }
      })
      .catch(() => setStatus('failed'));
  }, [target.path]);

  useEffect(() => {
    void getVideoTool()
      .then((tool) => (tool.installed ? open() : setStatus('learning')))
      .catch(() => setStatus('learning'));
  }, [open]);

  // The player could not play it after all (a codec it does not know): a light copy, once.
  const playerFailed = useCallback(() => {
    if (previewed.current) return setStatus('failed');
    previewed.current = true;
    setStatus('previewing');
    void makeMediaPreview(target.path)
      .then((next) => {
        setUrl(next);
        setStatus('ready');
      })
      .catch(() => setStatus('failed'));
  }, [target.path]);

  // What Rust serves and the light copies go when the screen does.
  useEffect(() => () => {
    void closeMedia().catch(() => undefined);
  }, []);
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

  return { status, info, url, stretch, move, mode, setMode, keyframes, realStart, strip, wave, changed, save, open, playerFailed };
};
