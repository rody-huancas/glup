import { describe, expect, it } from 'vitest';
import type { EditorState } from '@/modules/organize/interfaces/editorState';
import type { EditorAction } from '@/modules/organize/types/editorAction';
import { canSave, createEditor, editorReducer, editSummary, hasChanges, keptPages, movePages, turn } from '@/modules/organize/utils/editor';

const run = (actions: EditorAction[], state: EditorState = createEditor(5)): EditorState => actions.reduce(editorReducer, state);

const order = (state: EditorState): number[] => state.pages.map((item) => item.page);

describe('organize editor', () => {
  it('opens with every page in place', () => {
    const state = createEditor(3);
    expect(order(state)).toEqual([1, 2, 3]);
    expect(hasChanges(state.pages)).toBe(false);
    expect(canSave(state.pages)).toBe(false);
  });

  it('turns left and right in quarter turns', () => {
    expect(turn(0, 'right')).toBe(90);
    expect(turn(270, 'right')).toBe(0);
    expect(turn(0, 'left')).toBe(270);
    expect(turn(90, 'left')).toBe(0);
  });

  it('rotates the chosen pages only', () => {
    const state = run([{ type: 'rotate', pages: [2, 4], direction: 'right' }, { type: 'rotate', pages: [4], direction: 'right' }]);
    expect(state.pages.map((item) => item.rotation)).toEqual([0, 90, 0, 180, 0]);
  });

  it('keeps removed pages in place until saving, and restores them', () => {
    const removed = run([{ type: 'remove', pages: [1, 3] }]);
    expect(order(removed)).toEqual([1, 2, 3, 4, 5]);
    expect(keptPages(removed.pages).map((item) => item.page)).toEqual([2, 4, 5]);

    const restored = run([{ type: 'restore', pages: [3] }], removed);
    expect(keptPages(restored.pages).map((item) => item.page)).toEqual([2, 3, 4, 5]);
  });

  it('moves one or several pages, keeping their relative order', () => {
    expect(order(run([{ type: 'move', pages: [1], to: 5 }]))).toEqual([2, 3, 4, 5, 1]);
    expect(order(run([{ type: 'move', pages: [5], to: 0 }]))).toEqual([5, 1, 2, 3, 4]);
    expect(order(run([{ type: 'move', pages: [4, 1], to: 3 }]))).toEqual([2, 3, 1, 4, 5]);
    expect(movePages({ pages: createEditor(3).pages, moved: [], to: 0 }).map((item) => item.page)).toEqual([1, 2, 3]);
  });

  it('undoes and redoes every change', () => {
    const edited = run([{ type: 'rotate', pages: [1], direction: 'left' }, { type: 'move', pages: [1], to: 5 }, { type: 'remove', pages: [2] }]);

    const once = run([{ type: 'undo' }], edited);
    expect(order(once)).toEqual([2, 3, 4, 5, 1]);
    expect(once.pages.every((item) => !item.removed)).toBe(true);

    const all = run([{ type: 'undo' }, { type: 'undo' }, { type: 'undo' }], edited);
    expect(hasChanges(all.pages)).toBe(false);

    const again = run([{ type: 'redo' }, { type: 'redo' }, { type: 'redo' }], all);
    expect(again.pages).toEqual(edited.pages);
  });

  it('forgets what was undone after a new change', () => {
    const state = run([{ type: 'remove', pages: [1] }, { type: 'undo' }, { type: 'rotate', pages: [2], direction: 'right' }]);
    expect(state.future).toEqual([]);
    expect(run([{ type: 'redo' }], state)).toBe(state);
  });

  it('does not remember changes that change nothing', () => {
    const state = run([{ type: 'move', pages: [2], to: 2 }, { type: 'restore', pages: [1] }, { type: 'undo' }]);
    expect(state.past).toEqual([]);
  });

  it('cannot save when every page would be removed', () => {
    const state = run([{ type: 'remove', pages: [1, 2, 3, 4, 5] }]);
    expect(hasChanges(state.pages)).toBe(true);
    expect(canSave(state.pages)).toBe(false);
  });

  it('sends the kept pages in their new order with the turn added', () => {
    const state = run([{ type: 'move', pages: [3], to: 0 }, { type: 'rotate', pages: [3, 1], direction: 'right' }, { type: 'remove', pages: [2, 5] }]);
    expect(keptPages(state.pages)).toEqual([{ page: 3, rotation: 90 }, { page: 1, rotation: 90 }, { page: 4, rotation: 0 }]);
    expect(editSummary(state.pages)).toEqual({ kept: 3, removed: 2, rotated: 2 });
  });
});
