import { useCallback, useEffect, useRef, useState } from 'react';
import type { PointerEvent, WheelEvent } from 'react';
import { PREVIEW_FRAME_HEIGHT, ZOOM_STEP } from '@/modules/id-photo/constants/idPhoto';
import type { IdCrop } from '@/modules/id-photo/interfaces/idCrop';
import type { IdFormat } from '@/modules/id-photo/interfaces/idFormat';
import type { PrepareReport } from '@/modules/id-photo/interfaces/prepareReport';
import { idPhotoPreview, prepareIdPhoto } from '@/modules/id-photo/services/idPhoto';
import { moveCrop, zoomCrop } from '@/modules/id-photo/utils/cropMath';

interface UseIdPreviewParams {
  path   : string;
  format : IdFormat;
}

// Prepares the photo (background, face), then lets the person move and zoom the crop by hand.
export const useIdPreview = ({ path, format }: UseIdPreviewParams) => {
  const [report, setReport] = useState<PrepareReport | null>(null);
  const [url, setUrl]       = useState<string | null>(null);
  const [crop, setCrop]     = useState<IdCrop | null>(null);
  const [error, setError]   = useState<string | null>(null);
  const drag                = useRef<{ x: number; y: number } | null>(null);
  const { kind, widthCm, heightCm } = format;

  useEffect(() => {
    let active  = true;
    let created = '';

    void prepareIdPhoto({ path, format: { kind, widthCm, heightCm } })
      .then(async (prepared) => {
        const preview = await idPhotoPreview(prepared.session);
        created = preview;
        if (!active) return URL.revokeObjectURL(preview);
        setReport(prepared);
        setCrop(prepared.crop);
        setUrl(preview);
      })
      .catch((reason: unknown) => active && setError(String(reason)));

    return () => {
      active = false;
      if (created) URL.revokeObjectURL(created);
    };
  }, [path, kind, widthCm, heightCm]);

  const scale = crop ? PREVIEW_FRAME_HEIGHT / crop.height : 1;

  const onPointerDown = useCallback((event: PointerEvent<HTMLElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { x: event.clientX, y: event.clientY };
  }, []);

  const onPointerMove = useCallback((event: PointerEvent<HTMLElement>) => {
    const start = drag.current;
    if (!start) return;

    drag.current = { x: event.clientX, y: event.clientY };
    setCrop((current) => (current ? moveCrop({ crop: current, dx: event.clientX - start.x, dy: event.clientY - start.y, scale }) : current));
  }, [scale]);

  const onPointerUp = useCallback(() => {
    drag.current = null;
  }, []);

  const zoom = useCallback((factor: number) => {
    if (!report) return;
    setCrop((current) => (current ? zoomCrop({ crop: current, suggested: report.crop, factor }) : current));
  }, [report]);

  const onWheel = useCallback((event: WheelEvent<HTMLElement>) => zoom(event.deltaY < 0 ? ZOOM_STEP : 1 / ZOOM_STEP), [zoom]);

  return {
    report,
    url,
    crop,
    error,
    zoomIn   : () => zoom(ZOOM_STEP),
    zoomOut  : () => zoom(1 / ZOOM_STEP),
    reset    : () => report && setCrop(report.crop),
    handlers : { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp, onWheel },
  };
};
