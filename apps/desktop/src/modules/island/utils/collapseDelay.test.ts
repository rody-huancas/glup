import { describe, expect, it } from 'vitest';
import { ISLAND_TIMING } from '@/modules/island/constants/island';
import { getToggleDelay } from '@/modules/island/utils/collapseDelay';

const RESTING = { state: 'collapsed' as const, dragging: false, blocked: false };

describe('getToggleDelay', () => {
  it('hidden, the cursor against the edge waits the delay of Ajustes before Glup comes out', () => {
    expect(getToggleDelay({ ...RESTING, inside: true, reveal: 500 })).toBe(500);
    expect(getToggleDelay({ ...RESTING, inside: true, reveal: 150 })).toBe(150);
  });

  it('as an island, the hover of always', () => {
    expect(getToggleDelay({ ...RESTING, inside: true })).toBe(ISLAND_TIMING.dwell);
    expect(getToggleDelay({ ...RESTING, inside: true, reveal: null })).toBe(ISLAND_TIMING.dwell);
  });

  it('passing by, or away from the edge, nothing comes out', () => {
    expect(getToggleDelay({ ...RESTING, inside: false, reveal: 300 })).toBeNull();
  });

  it('a file dragged onto it opens it at once, hidden or not', () => {
    expect(getToggleDelay({ ...RESTING, inside: true, dragging: true, reveal: 800 })).toBe(ISLAND_TIMING.dragDwell);
  });

  it('open, it closes as always when the cursor leaves', () => {
    expect(getToggleDelay({ state: 'expanded', inside: false, dragging: false, blocked: false, reveal: 800 })).toBe(ISLAND_TIMING.leaveDelay);
  });
});
