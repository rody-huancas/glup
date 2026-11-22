import { useEffect, useRef, useState } from 'react';

// True once the element has come near the visible area of its scroll container (lazy loading).
export const useInView = <T extends Element>(margin = '120px') => {
  const ref               = useRef<T | null>(null);
  const [seen, setSeen]   = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element || seen) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) setSeen(true);
      },
      { rootMargin: margin },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [margin, seen]);

  return { ref, seen };
};
