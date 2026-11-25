import { useCallback, useEffect, useRef, useState } from 'react';
import type { PictureBox } from '@/modules/media/interfaces/pictureBox';

// How big the <video> is drawn now (it changes with the panel), to size what goes over it.
export const usePictureBox = () => {
  const [box, setBox] = useState<PictureBox | null>(null);
  const observer      = useRef<ResizeObserver | null>(null);

  const measure = useCallback((node: HTMLElement | null) => {
    observer.current?.disconnect();
    if (!node) return;
    observer.current = new ResizeObserver(([entry]) => setBox({ width: entry.contentRect.width, height: entry.contentRect.height }));
    observer.current.observe(node);
  }, []);

  useEffect(() => () => observer.current?.disconnect(), []);

  return { box, measure };
};
