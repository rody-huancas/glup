import { useCallback, useEffect, useRef } from 'react';
import type { KeyboardEvent, RefObject } from 'react';
import { nextFocusIndex } from '@/shared/utils/focusTrap';

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

interface UseFocusTrapParams {
  containerRef : RefObject<HTMLElement | null>;
  onEscape     : () => void;
}

// A modal dialog: the focus starts on its first control (the safe one), Tab never leaves it, Esc
// closes it and, once closed, the focus goes back to what opened it.
export const useFocusTrap = ({ containerRef, onEscape }: UseFocusTrapParams) => {
  const escapeRef = useRef(onEscape);

  useEffect(() => {
    escapeRef.current = onEscape;
  }, [onEscape]);

  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    containerRef.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus();

    return () => {
      if (opener?.isConnected) opener.focus();
    };
  }, [containerRef]);

  // React's stopPropagation keeps Esc from reaching the window, where it would collapse the island.
  return useCallback((event: KeyboardEvent<HTMLElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      escapeRef.current();
      return;
    }

    if (event.key !== 'Tab' || !containerRef.current) return;

    const items = Array.from(containerRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
    const next  = nextFocusIndex({ current: items.indexOf(document.activeElement as HTMLElement), count: items.length, backwards: event.shiftKey });

    event.preventDefault();
    if (next !== null) items[next]?.focus();
  }, [containerRef]);
};
