import { describe, expect, it } from 'vitest';
import { createEditor, editorReducer } from '@/modules/organize/utils/editor';
import { moveTarget, readKey } from '@/modules/organize/utils/keys';

interface Held {
  ctrl?  : boolean;
  shift? : boolean;
}

const press = (key: string, held: Held = {}) =>
  readKey({ key, ctrlKey: held.ctrl ?? false, metaKey: false, shiftKey: held.shift ?? false }, 6);

describe('readKey', () => {
  it('arrows move around, a whole row up or down', () => {
    expect(press('ArrowRight')).toEqual({ type: 'focus', step: 1 });
    expect(press('ArrowUp')).toEqual({ type: 'focus', step: -6 });
  });

  it('Ctrl+arrows move the chosen pages', () => {
    expect(press('ArrowLeft', { ctrl: true })).toEqual({ type: 'move', step: -1 });
    expect(press('ArrowDown', { ctrl: true })).toEqual({ type: 'move', step: 6 });
  });

  it('Supr removes; Ctrl+Z, Ctrl+Y and Ctrl+Mayús+Z undo and redo', () => {
    expect(press('Delete')).toEqual({ type: 'remove' });
    expect(press('z', { ctrl: true })).toEqual({ type: 'undo' });
    expect(press('Z', { ctrl: true, shift: true })).toEqual({ type: 'redo' });
    expect(press('y', { ctrl: true })).toEqual({ type: 'redo' });
    expect(press('a', { ctrl: true })).toEqual({ type: 'select-all' });
    expect(press('z')).toBeNull();
  });
});

describe('moveTarget', () => {
  const order = [1, 2, 3, 4, 5];
  const moved = (pages: number[], step: number) =>
    editorReducer(createEditor(5), { type: 'move', pages, to: moveTarget({ order, pages, step }) }).pages.map((item) => item.page);

  it('moves one page a place left or right', () => {
    expect(moved([3], -1)).toEqual([1, 3, 2, 4, 5]);
    expect(moved([3], 1)).toEqual([1, 2, 4, 3, 5]);
  });

  it('stops at the edges', () => {
    expect(moved([1], -1)).toEqual([1, 2, 3, 4, 5]);
    expect(moved([5], 6)).toEqual([1, 2, 3, 4, 5]);
    expect(moved([2], 6)).toEqual([1, 3, 4, 5, 2]);
  });

  it('moves several pages together', () => {
    expect(moved([2, 3], 1)).toEqual([1, 4, 2, 3, 5]);
    expect(moveTarget({ order, pages: [9], step: 1 })).toBe(-1);
  });
});
