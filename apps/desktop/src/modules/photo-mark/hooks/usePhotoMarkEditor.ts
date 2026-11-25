import { useEffect, useState } from 'react';
import { usePhotoSizes } from '@/modules/photo-tools/hooks/usePhotoSizes';
import { queuePhotos } from '@/modules/photo-tools/utils/run';
import { DEFAULT_MARK } from '@/modules/photo-mark/constants/texts';
import type { MarkOptions } from '@/modules/photo-mark/interfaces/markOptions';
import { getMarkConfig, pickLogo } from '@/modules/photo-mark/services/photoMark';
import type { SaveLocation } from '@/modules/settings/interfaces/saveLocation';

interface PhotoMarkParams {
  paths    : string[];
  location : SaveLocation;
  onExit   : () => void;
}

// "Marca de agua": the last choices brought back, the mark changed with a live preview on any photo,
// and saving them as a task (Rust keeps these choices for next time).
export const usePhotoMarkEditor = ({ paths, location, onExit }: PhotoMarkParams) => {
  const [options, setOptions] = useState<MarkOptions>({ ...DEFAULT_MARK });
  const [index, setIndex]     = useState(0);
  const [changed, setChanged] = useState(false);
  const sizes                 = usePhotoSizes(paths);

  useEffect(() => {
    void getMarkConfig().then(setOptions).catch(() => undefined);
  }, []);

  const change = (next: Partial<MarkOptions>) => {
    setChanged(true);
    setOptions((current) => ({ ...current, ...next }));
  };

  const chooseLogo = () => {
    void pickLogo().then((logo) => logo && change({ logo, kind: 'logo' })).catch(() => undefined);
  };

  const ready = options.kind === 'text' ? options.text.trim() !== '' : options.logo !== null;

  const save = () => {
    queuePhotos({ actionId: 'photo-mark', paths, location, options: { mark: options } });
    onExit();
  };

  return { options, change, chooseLogo, index, setIndex, size: sizes[index] ?? null, ready, changed, save };
};
