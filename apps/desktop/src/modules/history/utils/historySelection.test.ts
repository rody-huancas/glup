import { describe, expect, it } from 'vitest';
import { keepPresent, selectionState, textPreview, toggleAll, toggleId } from '@/modules/history/utils/historySelection';

const IDS = ['a', 'b', 'c'];

describe('history selection', () => {
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

describe('textPreview', () => {
  it('puts the start of the text on one line', () => {
    expect(textPreview('Hola\n\nmundo  feliz', 40)).toBe('Hola mundo feliz');
  });

  it('cuts a long text with "…"', () => {
    expect(textPreview('Una frase bastante larga para la fila', 16)).toBe('Una frase bastan…');
  });
});
