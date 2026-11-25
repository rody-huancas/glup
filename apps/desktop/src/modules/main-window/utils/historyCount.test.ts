import { describe, expect, it } from 'vitest';
import { countLabel, countNewEntries } from '@/modules/main-window/utils/historyCount';

describe('the count of the Historial', () => {
  const seen    = Date.parse('2026-11-24T10:00:00-05:00');
  const entries = [
    { date: '2026-11-24T11:30:00-05:00' },
    { date: '2026-11-24T10:00:01-05:00' },
    { date: '2026-11-24T09:59:00-05:00' },
    { date: '2026-11-20T08:00:00-05:00' },
  ];

  it('counts what came after the last time it was opened', () => {
    expect(countNewEntries(entries, seen)).toBe(2);
    expect(countNewEntries(entries, Date.parse('2026-11-25T00:00:00-05:00'))).toBe(0);
  });

  it('counts nothing until it is first opened (seen is set on the first run)', () => {
    expect(countNewEntries(entries, null)).toBe(0);
  });

  it('shows big counts short', () => {
    expect(countLabel(7)).toBe('7');
    expect(countLabel(140)).toBe('99+');
  });
});
