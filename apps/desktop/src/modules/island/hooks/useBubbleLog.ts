import { useEffect } from 'react';
import { logBubble } from '@/modules/island/utils/islandLog';

// Dev only: every press, release, click, focus and blur the bubble's window hears, with whether it has
// the focus, so a click that gets lost shows where.
export const useBubbleLog = (active: boolean) => {
  useEffect(() => {
    if (!active || !import.meta.env.DEV) return;

    const target  = (event: Event) => (event.target instanceof Element ? event.target.tagName.toLowerCase() : 'window');
    const pointer = (event: PointerEvent) => logBubble(`${event.type} ${target(event)} botones=${event.buttons} foco=${document.hasFocus()}`);
    const plain   = (event: Event) => logBubble(`${event.type} ${target(event)} foco=${document.hasFocus()}`);

    const pointers = ['pointerdown', 'pointerup', 'pointercancel'] as const;
    const others   = ['click', 'focus', 'blur'] as const;

    pointers.forEach((type) => window.addEventListener(type, pointer, true));
    others.forEach((type) => window.addEventListener(type, plain, true));

    return () => {
      pointers.forEach((type) => window.removeEventListener(type, pointer, true));
      others.forEach((type) => window.removeEventListener(type, plain, true));
    };
  }, [active]);
};
