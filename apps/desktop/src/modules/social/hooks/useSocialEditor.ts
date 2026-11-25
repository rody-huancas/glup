import { useCallback, useEffect, useMemo, useState } from 'react';
import { findPhotoFace } from '@/modules/photo-tools/services/photoTools';
import { usePhotoSizes } from '@/modules/photo-tools/hooks/usePhotoSizes';
import { queuePhotos } from '@/modules/photo-tools/utils/run';
import type { SaveLocation } from '@/modules/settings/interfaces/saveLocation';
import { CUSTOM_ID, NETWORKS } from '@/modules/social/constants/sizes';
import { SOCIAL_TEXTS } from '@/modules/social/constants/texts';
import type { Framing } from '@/modules/social/interfaces/framing';
import type { SocialSize } from '@/modules/social/interfaces/socialSize';
import type { SocialFit, SocialFormat } from '@/modules/social/types/socialFit';
import { CENTERED, frameFor, framingOnFace, keepRatio, moveFraming, zoomFraming } from '@/modules/social/utils/frame';

interface SocialEditorParams {
  paths    : string[];
  location : SaveLocation;
  onExit   : () => void;
}

// "Tamaño para redes": the size (or a custom one), how the photo fits, the frame (one for all, or one
// for a photo when asked), started on each photo's face, and saving them as a task.
export const useSocialEditor = ({ paths, location, onExit }: SocialEditorParams) => {
  const [networkId, setNetworkId] = useState(NETWORKS[0].id);
  const [sizeId, setSizeId]       = useState(NETWORKS[0].sizes[2].id);
  const [custom, setCustom]       = useState({ width: 1080, height: 1080, locked: true });
  const [fit, setFit]             = useState<SocialFit>('crop');
  const [fill, setFill]           = useState('#FFFFFF');
  const [blur, setBlur]           = useState(false);
  const [format, setFormat]       = useState<SocialFormat>('jpg');
  const [index, setIndex]         = useState(0);
  const [shared, setShared]       = useState<Framing | null>(null);
  const [own, setOwn]             = useState<Record<number, Framing>>({});
  const [faces, setFaces]         = useState<Record<number, Framing>>({});
  const [onlyThis, setOnlyThis]   = useState(false);
  const [changed, setChanged]     = useState(false);
  const sizes                     = usePhotoSizes(paths);

  const size = useMemo<SocialSize>(() => {
    if (networkId === CUSTOM_ID) return { id: CUSTOM_ID, label: SOCIAL_TEXTS.custom, tag: SOCIAL_TEXTS.customTag(custom.width, custom.height), width: custom.width, height: custom.height };
    const network = NETWORKS.find((each) => each.id === networkId) ?? NETWORKS[0];
    return network.sizes.find((each) => each.id === sizeId) ?? network.sizes[0];
  }, [networkId, sizeId, custom]);

  // Each photo starts on its face, looked for when it is first shown.
  useEffect(() => {
    if (faces[index] || !paths[index]) return;
    let active = true;
    void findPhotoFace(paths[index]).then((face) => active && setFaces((current) => ({ ...current, [index]: framingOnFace(face) }))).catch(() => undefined);
    return () => {
      active = false;
    };
  }, [index, paths, faces]);

  const aspectOf     = (at: number): number => (sizes[at] ? (sizes[at]?.[0] ?? 1) / (sizes[at]?.[1] ?? 1) : 1);
  const framingOf    = useCallback((at: number): Framing => own[at] ?? shared ?? faces[at] ?? CENTERED, [own, shared, faces]);
  const targetAspect = size.width / size.height;
  const frame        = frameFor({ photoAspect: aspectOf(index), targetAspect, framing: framingOf(index) });

  const setFraming = (next: Framing) => {
    setChanged(true);
    if (onlyThis || paths.length === 1) setOwn((current) => ({ ...current, [index]: next }));
    else setShared(next);
  };
  const move = (dx: number, dy: number) => setFraming(moveFraming({ photoAspect: aspectOf(index), targetAspect, framing: framingOf(index), dx, dy }));
  const zoom = (value: number) => setFraming(zoomFraming({ photoAspect: aspectOf(index), targetAspect, framing: framingOf(index), zoom: value }));

  const chooseNetwork = (id: string) => {
    setNetworkId(id);
    const network = NETWORKS.find((each) => each.id === id);
    if (network) setSizeId(network.sizes[0].id);
  };

  const setCustomSide = (side: 'width' | 'height', value: number) =>
    setCustom((current) => {
      const ratio = current.height / current.width;
      if (!current.locked) return { ...current, [side]: value };
      return side === 'width' ? { ...current, width: value, height: keepRatio(value, ratio) } : { ...current, height: value, width: keepRatio(value, 1 / ratio) };
    });

  const save = () => {
    const frames = paths.map((_, at) => frameFor({ photoAspect: aspectOf(at), targetAspect, framing: framingOf(at) }));
    queuePhotos({ actionId: 'social-size', paths, location, options: { social: { width: size.width, height: size.height, tag: size.tag, format, fit, fill, blur, frames } } });
    onExit();
  };

  return {
    networkId, chooseNetwork, sizeId, setSizeId, size, custom, setCustomSide, setLocked: (locked: boolean) => setCustom((current) => ({ ...current, locked })),
    fit, setFit, fill, setFill, blur, setBlur, format, setFormat, index, setIndex, frame, zoomLevel: framingOf(index).zoom, move, zoom,
    onlyThis, setOnlyThis, changed, save, valid: size.width > 0 && size.height > 0 && size.width <= 8000 && size.height <= 8000,
  };
};
