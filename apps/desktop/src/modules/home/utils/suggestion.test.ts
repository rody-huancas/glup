import { describe, expect, it } from 'vitest';
import type { SuggestionFacts } from '@/modules/home/interfaces/suggestionFacts';
import { dismissSuggestion, pickSuggestion, suggestionsFor } from '@/modules/home/utils/suggestion';

const GB = 1024 ** 3;
const MB = 1024 ** 2;

const facts = (fields: Partial<SuggestionFacts>): SuggestionFacts => ({
  disk: { free: 200 * GB, total: 500 * GB }, cleanup: null, downloads: null, dismissed: [], ...fields,
});

describe('the suggestions of Inicio', () => {
  it('says nothing when there is nothing useful', () => {
    expect(pickSuggestion(facts({}))).toBeNull();
    expect(pickSuggestion(facts({ cleanup: 100 * MB, downloads: { folder: 'D', count: 4, bytes: 20 * MB } }))).toBeNull();
  });

  it('speaks of real sizes: Limpieza and Descargas', () => {
    expect(pickSuggestion(facts({ cleanup: 1.1 * GB }))?.text).toBe('Limpieza encontró 1,1 GB que puedes liberar.');
    const downloads = pickSuggestion(facts({ downloads: { folder: 'D', count: 120, bytes: 2.3 * GB } }));
    expect(downloads?.text).toBe('Tienes 2,3 GB en Descargas para ordenar (120 archivos).');
    expect(downloads?.page).toBe('folder-sort');
  });

  it('puts a nearly full disk first', () => {
    const all = suggestionsFor(facts({ disk: { free: 20 * GB, total: 500 * GB }, cleanup: 2 * GB }));
    expect(all.map((item) => item.page)).toEqual(['cleanup', 'cleanup']);
    expect(all[0].key.startsWith('low-disk')).toBe(true);
  });

  it('once closed, stays closed until it changes', () => {
    const first  = pickSuggestion(facts({ cleanup: 1.1 * GB }));
    const closed = dismissSuggestion([], first?.key ?? '');
    expect(pickSuggestion(facts({ cleanup: 1.1 * GB + 5 * MB, dismissed: closed }))).toBeNull();
    expect(pickSuggestion(facts({ cleanup: 3 * GB, dismissed: closed }))?.text).toBe('Limpieza encontró 3 GB que puedes liberar.');
  });

  it('shows the next one when the first was closed, and remembers only the last few', () => {
    const both   = facts({ cleanup: 1.1 * GB, downloads: { folder: 'D', count: 40, bytes: 300 * MB } });
    const closed = dismissSuggestion([], pickSuggestion(both)?.key ?? '');
    expect(pickSuggestion({ ...both, dismissed: closed })?.page).toBe('folder-sort');

    const many = Array.from({ length: 20 }, (_, index) => `k${index}`).reduce(dismissSuggestion, [] as string[]);
    expect(many).toHaveLength(12);
    expect(many.at(-1)).toBe('k19');
    expect(dismissSuggestion(['a', 'b'], 'a')).toEqual(['b', 'a']);
  });
});
