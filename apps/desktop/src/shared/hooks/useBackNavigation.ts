import { useEffect, useRef } from 'react';

interface BackNavigationParams {
  enabled : boolean;
  onBack  : () => void;
}

const MOUSE_BACK = 3;

// Typing or inside a dialog, Esc and Alt+← belong there.
const ownsKeys = (target: EventTarget | null): boolean =>
  target instanceof HTMLElement && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.closest('[aria-modal="true"]') !== null);

// Esc, Alt+← and the back button of the mouse go one screen back. Heard first (capture), so Esc goes
// back instead of collapsing the panel.
export const useBackNavigation = ({ enabled, onBack }: BackNavigationParams) => {
  const latest = useRef(onBack);

  useEffect(() => {
    latest.current = onBack;
  }, [onBack]);

  useEffect(() => {
    if (!enabled) return;

    const onKeyDown = (event: KeyboardEvent) => {
      const back = (event.key === 'Escape' && !event.altKey && !event.ctrlKey) || (event.key === 'ArrowLeft' && event.altKey);
      if (!back || event.defaultPrevented || ownsKeys(event.target) || document.querySelector('[aria-modal="true"]')) return;
      event.preventDefault();
      event.stopPropagation();
      latest.current();
    };
    const onMouseUp = (event: MouseEvent) => {
      if (event.button !== MOUSE_BACK) return;
      event.preventDefault();
      latest.current();
    };
    // The webview would take the back button as its own history.
    const onMouseDown = (event: MouseEvent) => event.button === MOUSE_BACK && event.preventDefault();

    window.addEventListener('keydown', onKeyDown, true);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('mousedown', onMouseDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown, true);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('mousedown', onMouseDown);
    };
  }, [enabled]);
};
