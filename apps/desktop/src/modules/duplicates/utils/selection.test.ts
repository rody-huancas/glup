import { describe, expect, it } from 'vitest';
import type { DuplicateGroup } from '@/modules/duplicates/interfaces/duplicateGroup';
import { defaultMarks, keepOnly, keepsOneInEach, keptPath, markedTotals, needsConfirm, toggleMark } from '@/modules/duplicates/utils/selection';

const file = (path: string, size = 100) => ({ path, size, modified: 0 });
const same: DuplicateGroup    = { id: 1, kind: 'same', files: [file('a/foto.jpg'), file('b/foto (1).jpg'), file('c/foto - copia.jpg')], keep: 0, quit: [1, 2], review: false, freeable: 200 };
const review: DuplicateGroup  = { id: 3, kind: 'same', files: [file('Fotos/viaje.jpg'), file('Respaldo/viaje.jpg')], keep: 0, quit: [], review: true, freeable: 100 };
const similar: DuplicateGroup = { id: 2, kind: 'similar', files: [file('r/1.jpg', 50), file('r/2.jpg', 60)], keep: null, quit: [], review: true, freeable: 50 };

describe('choosing what to quit', () => {
  it('marks only the clear copies; a group to review and alike photos come with nothing marked', () => {
    expect([...defaultMarks([same, review, similar])].sort()).toEqual(['b/foto (1).jpg', 'c/foto - copia.jpg']);
  });

  it('asks before quitting a lot', () => {
    expect(needsConfirm({ count: 50, bytes: 1024 ** 3 })).toBe(false);
    expect(needsConfirm({ count: 51, bytes: 10 })).toBe(true);
    expect(needsConfirm({ count: 3, bytes: 1024 ** 3 + 1 })).toBe(true);
  });

  it('never lets the last copy of a group be marked', () => {
    const marked = defaultMarks([same]);
    expect(toggleMark({ group: same, path: 'a/foto.jpg', marked })).toBeNull();
    // Unmark one, and then the first can be marked.
    const fewer = toggleMark({ group: same, path: 'b/foto (1).jpg', marked });
    expect(fewer?.has('b/foto (1).jpg')).toBe(false);
    expect(toggleMark({ group: same, path: 'a/foto.jpg', marked: fewer ?? marked })?.has('a/foto.jpg')).toBe(true);

    // Alike photos: one can go, not both.
    const one = toggleMark({ group: similar, path: 'r/1.jpg', marked: new Set() }) ?? new Set<string>();
    expect(toggleMark({ group: similar, path: 'r/2.jpg', marked: one })).toBeNull();
  });

  it('changes which one stays', () => {
    const marked = keepOnly({ group: same, path: 'c/foto - copia.jpg', marked: defaultMarks([same]) });
    expect(keptPath(same, marked)).toBe('c/foto - copia.jpg');
    expect(keepsOneInEach([same], marked)).toBe(true);
    expect(keepsOneInEach([same], new Set(same.files.map((item) => item.path)))).toBe(false);
  });

  it('adds up what is marked', () => {
    expect(markedTotals([same, similar], new Set(['b/foto (1).jpg', 'r/2.jpg']))).toEqual({ count: 2, bytes: 160 });
  });
});
