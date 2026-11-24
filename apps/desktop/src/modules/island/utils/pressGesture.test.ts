import { describe, expect, it } from 'vitest';
import type { PressState } from '@/modules/island/interfaces/pressState';
import type { PressEvent } from '@/modules/island/types/pressEvent';
import { INITIAL_PRESS, pressStep } from '@/modules/island/utils/pressGesture';

// The clicks that open, for a run of press events.
const clicks = (events: PressEvent[]): boolean[] => {
  let state: PressState = INITIAL_PRESS;

  return events.flatMap((event) => {
    const step = pressStep(state, event);
    state      = step.state;
    return event.type === 'click' ? [step.click] : [];
  });
};

describe('pressStep', () => {
  it('a press and release without moving is a click that opens it', () => {
    expect(clicks([{ type: 'down' }, { type: 'click' }])).toEqual([true]);
  });

  it('the click that ends a drag never opens it', () => {
    expect(clicks([{ type: 'down' }, { type: 'drag' }, { type: 'click' }])).toEqual([false]);
  });

  it('after a drag whose last click never came, one single click opens it', () => {
    expect(clicks([{ type: 'down' }, { type: 'drag' }, { type: 'down' }, { type: 'click' }])).toEqual([true]);
  });

  it('a drag swallows only its own click, the next one opens', () => {
    expect(clicks([{ type: 'down' }, { type: 'drag' }, { type: 'click' }, { type: 'down' }, { type: 'click' }])).toEqual([false, true]);
  });

  it('Enter or Space on the bubble (a click with no press) opens it', () => {
    expect(clicks([{ type: 'click' }])).toEqual([true]);
  });
});
