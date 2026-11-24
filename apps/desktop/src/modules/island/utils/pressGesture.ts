import type { PressState } from '@/modules/island/interfaces/pressState';
import type { PressEvent } from '@/modules/island/types/pressEvent';

// One press on the pill or the bubble ends as a click or as a drag, never both.
interface PressStep {
  state : PressState;
  // The click opens (or closes) the island: it was not the end of a drag.
  click : boolean;
}

export const INITIAL_PRESS: PressState = { dragged: false };

// A click belongs to its own press: every new press starts clean, so a drag whose last click never came
// (the button came up with Rust following the cursor) cannot swallow the next real click. The click that
// ends a drag is swallowed once. A click with no press (Enter or Space on the bubble) is a click.
export const pressStep = (state: PressState, event: PressEvent): PressStep => {
  if (event.type === 'down') return { state: { dragged: false }, click: false };
  if (event.type === 'drag') return { state: { dragged: true }, click: false };
  return { state: { dragged: false }, click: !state.dragged };
};
