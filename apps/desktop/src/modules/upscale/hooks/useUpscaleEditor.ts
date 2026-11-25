import { useCallback, useEffect, useState } from 'react';
import { LEARNABLES } from '@/modules/background/constants/learnables';
import type { ModelStatus } from '@/modules/background/interfaces/modelStatus';
import { usePhotoSizes } from '@/modules/photo-tools/hooks/usePhotoSizes';
import { queuePhotos } from '@/modules/photo-tools/utils/run';
import type { SaveLocation } from '@/modules/settings/interfaces/saveLocation';
import { getUpscalePreview } from '@/modules/upscale/services/upscale';
import type { UpscaleLevel } from '@/modules/upscale/types/upscaleLevel';
import { outputSize, tooBigCount } from '@/modules/upscale/utils/upscale';

interface UpscaleEditorParams {
  paths    : string[];
  location : SaveLocation;
  onExit   : () => void;
}

export const learnableOf = (level: UpscaleLevel) => LEARNABLES[level === 'fast' ? 'upscale-fast' : 'upscale-detail'];

// "Mejorar calidad": the level (downloaded the first time, with permission), x2 or x4, the size it
// gives, «Antes / Después» on a piece of the photo shown, and saving them all as a task.
export const useUpscaleEditor = ({ paths, location, onExit }: UpscaleEditorParams) => {
  const [level, setLevelState]      = useState<UpscaleLevel>('fast');
  const [scale, setScale]           = useState<1 | 2 | 4>(1);
  const [status, setStatus]         = useState<ModelStatus | null>(null);
  const [downloading, setLoading]   = useState(false);
  const [index, setIndex]           = useState(0);
  const [preview, setPreview]       = useState<string | null>(null);
  const [comparing, setComparing]   = useState(false);
  const [failed, setFailed]         = useState(false);
  const sizes                       = usePhotoSizes(paths);

  const refresh = useCallback(() => {
    void learnableOf(level).getStatus().then(setStatus).catch(() => setStatus(null));
  }, [level]);
  useEffect(refresh, [refresh]);

  // Another photo, level or scale: the comparison is old.
  useEffect(() => {
    setPreview(null);
    setFailed(false);
  }, [index, level, scale]);
  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  const compare = () => {
    setComparing(true);
    setFailed(false);
    void getUpscalePreview({ path: paths[index], options: { level, scale } })
      .then(setPreview)
      .catch(() => setFailed(true))
      .finally(() => setComparing(false));
  };

  const save = () => {
    queuePhotos({ actionId: 'upscale', paths, location, options: { upscale: { level, scale } } });
    onExit();
  };

  const size    = sizes[index] ?? null;
  const tooBig  = tooBigCount(sizes, scale);
  const learned = status?.installed ?? false;

  return {
    level, setLevel: (next: UpscaleLevel) => setLevelState(next), scale, setScale, learned, status, downloading, setLoading, refresh,
    index, setIndex, output: size ? outputSize(size, scale) : null, tooBig, allTooBig: sizes.length > 0 && tooBig === paths.length,
    preview, comparing, failed, compare, closePreview: () => setPreview(null), save,
  };
};
