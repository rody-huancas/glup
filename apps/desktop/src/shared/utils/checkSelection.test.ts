import { describe, expect, it } from 'vitest';
import { keepPresent, selectionState, toggleAll, toggleId } from '@/shared/utils/checkSelection';

const IDS = ['a', 'b', 'c'];

describe('check selection', () => {
  it('marks and unmarks one line', () => {
    expect(toggleId([], 'a')).toEqual(['a']);
    expect(toggleId(['a', 'b'], 'a')).toEqual(['b']);
  });

  it('"Seleccionar todo" marks everything, and a second time nothing', () => {
    expect(toggleAll(['a'], IDS)).toEqual(IDS);
    expect(toggleAll(IDS, IDS)).toEqual([]);
    expect(toggleAll([], [])).toEqual([]);
  });

  it('says whether none, some or all are marked', () => {
    expect(selectionState([], IDS)).toBe('none');
    expect(selectionState(['b'], IDS)).toBe('some');
    expect(selectionState(['c', 'a', 'b'], IDS)).toBe('all');
    expect(selectionState(['x'], IDS)).toBe('none');
  });

  it('forgets lines that are no longer in the list', () => {
    expect(keepPresent(['a', 'x'], IDS)).toEqual(['a']);
  });
});
