import { useCallback, useMemo, useState } from 'react';
import { ZOOM } from '@/modules/sign/constants/sign';
import type { Size } from '@/modules/sign/interfaces/geometry';

interface UseViewerZoomParams {
  // The page in points and the room to show it, in CSS pixels.
  pageSize : Size | null;
  viewport : Size;
}

const clampScale = (scale: number): number => Math.min(Math.max(scale, ZOOM.min), ZOOM.max);

// "Ajustar" fits the page in the available room (it follows page changes and resizes); 100% is pdf.js
// scale 1; + and − step from whatever is shown.
export const useViewerZoom = ({ pageSize, viewport }: UseViewerZoomParams) => {
  const [fitted, setFitted] = useState(true);
  const [custom, setCustom] = useState(ZOOM.actual);

  const fitScale = useMemo(() => {
    if (!pageSize || viewport.width === 0 || viewport.height === 0) return 1;

    const room = Math.min((viewport.width - ZOOM.margin * 2) / pageSize.width, (viewport.height - ZOOM.margin * 2) / pageSize.height);
    return clampScale(Math.round(room * 1000) / 1000);
  }, [pageSize, viewport.width, viewport.height]);

  const scale = fitted ? fitScale : custom;

  const fit = useCallback(() => setFitted(true), []);

  const setScale = useCallback((next: number) => {
    setCustom(clampScale(next));
    setFitted(false);
  }, []);

  return {
    scale,
    fitted,
    percent : Math.round((scale / ZOOM.actual) * 100),
    fit,
    actual  : () => setScale(ZOOM.actual),
    zoomIn  : () => setScale(scale * ZOOM.step),
    zoomOut : () => setScale(scale / ZOOM.step),
  };
};
