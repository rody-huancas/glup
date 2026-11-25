import { useEffect, useRef, useState } from 'react';
import type { Size } from '@/shared/interfaces/size';

// The element's content box, kept up to date while it resizes.
export const useElementSize = <T extends HTMLElement>() => {
  const ref             = useRef<T | null>(null);
  const [size, setSize] = useState<Size>({ width: 0, height: 0 });

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new ResizeObserver(([entry]) => {
      setSize({ width: entry.contentRect.width, height: entry.contentRect.height });
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return { ref, size };
};
