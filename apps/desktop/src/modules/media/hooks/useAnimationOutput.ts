import { useCallback, useEffect, useMemo, useState } from 'react';
import { ANIMATION_TEXTS } from '@/modules/media/constants/texts';
import type { AnimationOptions, AnimationPreview } from '@/modules/media/interfaces/animationOptions';
import type { MediaInfo } from '@/modules/media/interfaces/mediaInfo';
import type { TrimTarget } from '@/modules/media/interfaces/trimTarget';
import { previewAnimation, saveAnimation } from '@/modules/media/services/animation';
import type { AnimationFormat } from '@/modules/media/types/animationFormat';
import { correction, defaultWidth, estimateBytes, HEAVY_BYTES, widthChoices } from '@/modules/media/utils/animation';
import type { Stretch } from '@/modules/media/utils/time';
import type { SaveDestination } from '@/modules/settings/interfaces/appSettings';
import { enqueueTask } from '@/modules/tasks/store/taskStore';

interface AnimationOutputParams {
  target  : TrimTarget;
  info    : MediaInfo | null;
  stretch : Stretch;
  onExit  : () => void;
}

const NO_FACTORS: Record<AnimationFormat, number> = { gif: 1, webp: 1 };

// "Video a GIF" on the trimming screen: its options, the weight they will give (corrected by the real
// one of each preview), the preview itself and saving it as a task.
export const useAnimationOutput = ({ target, info, stretch, onExit }: AnimationOutputParams) => {
  const widths                      = useMemo(() => widthChoices(info?.width ?? 0), [info]);
  const [options, setOptions]       = useState<AnimationOptions>({ format: 'gif', width: 480, fps: 15, loopForever: true });
  const [preview, setPreview]       = useState<AnimationPreview | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [failed, setFailed]         = useState(false);
  const [factors, setFactors]       = useState(NO_FACTORS);

  useEffect(() => {
    setOptions((current) => (widths.includes(current.width) ? current : { ...current, width: defaultWidth(widths) }));
  }, [widths]);

  // Any change makes the preview old.
  useEffect(() => {
    setPreview(null);
    setFailed(false);
  }, [options, stretch.start, stretch.end]);

  const seconds  = stretch.end - stretch.start;
  const estimate = (factor: number) => estimateBytes({ ...options, sourceWidth: info?.width ?? 0, sourceHeight: info?.height ?? 0, seconds, factor });
  const weight   = preview?.size ?? estimate(factors[options.format]);

  const change = useCallback((next: Partial<AnimationOptions>) => setOptions((current) => ({ ...current, ...next })), []);

  const makePreview = useCallback(() => {
    setPreviewing(true);
    setFailed(false);
    const raw = estimateBytes({ ...options, sourceWidth: info?.width ?? 0, sourceHeight: info?.height ?? 0, seconds, factor: 1 });
    void previewAnimation({ path: target.path, start: stretch.start, end: stretch.end, options })
      .then((made) => {
        setPreview(made);
        setFactors((current) => ({ ...current, [options.format]: correction(made.size, raw) }));
      })
      .catch(() => setFailed(true))
      .finally(() => setPreviewing(false));
  }, [options, info, seconds, target.path, stretch]);

  const save = useCallback((destination: SaveDestination) => {
    const { start, end } = stretch;
    enqueueTask({
      title     : ANIMATION_TEXTS.taskTitle(target.name),
      actionId  : 'to-gif',
      type      : 'video',
      fileCount : 1,
      owner     : 'home',
      run       : ({ taskId }) => saveAnimation({ path: target.path, start, end, options, destination, taskId }),
    });
    onExit();
  }, [stretch, target, options, onExit]);

  return { widths, options, change, weight, exact: preview !== null, heavy: weight > HEAVY_BYTES, preview, previewing, failed, makePreview, closePreview: () => setPreview(null), save };
};
