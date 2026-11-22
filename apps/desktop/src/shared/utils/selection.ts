import type { MouseEvent } from 'react';

const EDITABLE_SELECTOR = 'input, textarea, select, [contenteditable="true"]';

// A press on a scrollbar lands outside the element's client box.
const isScrollbarPress = (event: MouseEvent, target: Element): boolean =>
  target.clientWidth > 0 && (event.nativeEvent.offsetX > target.clientWidth || event.nativeEvent.offsetY > target.clientHeight);

// Stops a press from starting a text selection or an image drag, except on editable fields and scrollbars.
export const preventSelectionStart = (event: MouseEvent) => {
  const target = event.target;

  if (!(target instanceof Element)) return;
  if (target.closest(EDITABLE_SELECTOR) || isScrollbarPress(event, target)) return;

  event.preventDefault();
};
