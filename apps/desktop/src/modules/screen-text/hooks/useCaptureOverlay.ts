import { useCallback, useEffect, useRef, useState } from 'react';
import type { PointerEvent, SyntheticEvent } from 'react';
import { STILL_TYPE } from '@/modules/screen-text/constants/screenText';
import type { Zone } from '@/modules/screen-text/interfaces/zone';
import { cancelScreenText, captureReady, getCaptureImage, readScreenText } from '@/modules/screen-text/services/screenText';
import { isZoneChosen, toStillZone, zoneBetween } from '@/modules/screen-text/utils/zone';
import { useKeyDown } from '@/shared/hooks/useKeyDown';
import type { Point } from '@/shared/interfaces/point';

const MAIN_BUTTON      = 0;
const SECONDARY_BUTTON = 2;

// One overlay: the still of its monitor, a drag to choose the zone, Esc or a right click to cancel.
export const useCaptureOverlay = () => {
  const [stillUrl, setStillUrl] = useState<string | null>(null);
  const [zone, setZone]         = useState<Zone | null>(null);
  const [choosing, setChoosing] = useState(false);
  const [reading, setReading]   = useState(false);
  const imageRef                = useRef<HTMLImageElement>(null);
  const start                   = useRef<Point | null>(null);

  // The still lives only as a blob in this webview's memory and is let go with the overlay.
  useEffect(() => {
    let url: string | null = null;
    let live               = true;

    void getCaptureImage()
      .then((bytes) => {
        if (!live) return;
        url = URL.createObjectURL(new Blob([bytes], { type: STILL_TYPE }));
        setStillUrl(url);
      })
      .catch(() => void cancelScreenText());

    return () => {
      live = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, []);

  const cancel = useCallback(() => {
    if (!reading) void cancelScreenText();
  }, [reading]);

  useKeyDown({ key: 'Escape', enabled: true, handler: cancel });

  const onStillLoad = useCallback(() => void captureReady(), []);

  const bounds = () => {
    const rect = imageRef.current?.getBoundingClientRect();
    return { width: rect?.width ?? 0, height: rect?.height ?? 0 };
  };

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (reading) return;
    if (event.button === SECONDARY_BUTTON) return cancel();
    if (event.button !== MAIN_BUTTON) return;

    event.currentTarget.setPointerCapture(event.pointerId);
    start.current = { x: event.clientX, y: event.clientY };
    setChoosing(true);
    setZone(null);
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!start.current) return;
    setZone(zoneBetween({ start: start.current, end: { x: event.clientX, y: event.clientY }, bounds: bounds() }));
  };

  const onPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    if (!start.current || event.button !== MAIN_BUTTON) return;

    const chosen  = zoneBetween({ start: start.current, end: { x: event.clientX, y: event.clientY }, bounds: bounds() });
    const image   = imageRef.current;
    start.current = null;
    setChoosing(false);

    if (!isZoneChosen(chosen) || !image) return setZone(null);

    setZone(chosen);
    setReading(true);
    void readScreenText(toStillZone({ zone: chosen, shown: bounds(), still: { width: image.naturalWidth, height: image.naturalHeight } })).catch(() => void cancelScreenText());
  };

  const onContextMenu = (event: SyntheticEvent) => event.preventDefault();

  return { stillUrl, imageRef, zone, choosing, onStillLoad, onPointerDown, onPointerMove, onPointerUp, onContextMenu };
};
