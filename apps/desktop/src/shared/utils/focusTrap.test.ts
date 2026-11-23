import { describe, expect, it } from 'vitest';
import { nextFocusIndex } from '@/shared/utils/focusTrap';

describe('nextFocusIndex', () => {
  it('moves forward and wraps from the last to the first', () => {
    expect(nextFocusIndex({ current: 0, count: 2, backwards: false })).toBe(1);
    expect(nextFocusIndex({ current: 1, count: 2, backwards: false })).toBe(0);
  });

  it('moves backwards and wraps from the first to the last', () => {
    expect(nextFocusIndex({ current: 1, count: 2, backwards: true })).toBe(0);
    expect(nextFocusIndex({ current: 0, count: 2, backwards: true })).toBe(1);
  });

  it('brings a focus that escaped back inside', () => {
    expect(nextFocusIndex({ current: -1, count: 3, backwards: false })).toBe(0);
    expect(nextFocusIndex({ current: -1, count: 3, backwards: true })).toBe(2);
  });

  it('stays put with a single element and does nothing without any', () => {
    expect(nextFocusIndex({ current: 0, count: 1, backwards: false })).toBe(0);
    expect(nextFocusIndex({ current: 0, count: 1, backwards: true })).toBe(0);
    expect(nextFocusIndex({ current: -1, count: 0, backwards: false })).toBeNull();
  });
});
