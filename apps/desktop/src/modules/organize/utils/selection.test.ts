import { describe, expect, it } from 'vitest';
import { selectModeOf, selectPage, targetPages } from '@/modules/organize/utils/selection';

const order = [3, 1, 2, 5, 4];

describe('page selection', () => {
  it('a click picks only that page', () => {
    expect(selectPage({ order, selected: [1, 2], anchor: 1, page: 5, mode: 'single' })).toEqual({ selected: [5], anchor: 5 });
  });

  it('Ctrl+click adds or takes out a page, in the order on screen', () => {
    expect(selectPage({ order, selected: [5], anchor: 5, page: 3, mode: 'toggle' })).toEqual({ selected: [3, 5], anchor: 3 });
    expect(selectPage({ order, selected: [3, 5], anchor: 3, page: 5, mode: 'toggle' })).toEqual({ selected: [3], anchor: 5 });
  });

  it('Shift+click takes the range from the anchor, in both directions', () => {
    expect(selectPage({ order, selected: [1], anchor: 1, page: 5, mode: 'range' }).selected).toEqual([1, 2, 5]);
    expect(selectPage({ order, selected: [4], anchor: 4, page: 1, mode: 'range' }).selected).toEqual([1, 2, 5, 4]);
    expect(selectPage({ order, selected: [], anchor: null, page: 2, mode: 'range' })).toEqual({ selected: [2], anchor: 2 });
  });

  it('reads the mode from the keys held', () => {
    expect(selectModeOf({ ctrlKey: false, metaKey: false, shiftKey: false })).toBe('single');
    expect(selectModeOf({ ctrlKey: true, metaKey: false, shiftKey: false })).toBe('toggle');
    expect(selectModeOf({ ctrlKey: true, metaKey: false, shiftKey: true })).toBe('range');
  });

  it('acts on the selection only when the page is part of it', () => {
    expect(targetPages([1, 2], 2)).toEqual([1, 2]);
    expect(targetPages([1, 2], 4)).toEqual([4]);
  });
});
