import { describe, expect, it } from 'vitest';
import type { HistoryEntry } from '@/modules/history/interfaces/historyEntry';
import { activityBuckets, bucketSummary, isEmptyPeriod, periodStats, rangeStart } from '@/modules/home/utils/activity';
import { TOOLS } from '@/modules/tools/constants/tools';

// Tuesday, 24 November 2026, at noon (local time, as the chart counts).
const now = new Date(2026, 10, 24, 12, 0);

let next = 0;
const entry = (date: Date, fields: Partial<HistoryEntry> = {}): HistoryEntry => ({
  id: String(next++), name: 'a', path: 'C:/a', type: 'pdf', action: 'merge', detail: '', date: date.toISOString(), ...fields,
});

const image = (date: Date) => entry(date, { type: 'image', action: 'compress' });
const pdf   = (date: Date) => entry(date, { type: 'pdf', action: 'merge' });

describe('the chart of Inicio', () => {
  it('has one bar a day for the last 7 days, today last, stacked by family', () => {
    const buckets = activityBuckets({
      entries : [image(new Date(2026, 10, 24, 9)), image(new Date(2026, 10, 24, 1)), pdf(new Date(2026, 10, 24, 11)), pdf(new Date(2026, 10, 18, 23, 59)), pdf(new Date(2026, 10, 17, 23))],
      tools   : TOOLS,
      range   : 'week',
      now,
    });

    expect(buckets).toHaveLength(7);
    expect(buckets[0].title).toBe('Miércoles');
    expect(buckets[6].title).toBe('Martes');
    expect(buckets[6].counts.images).toBe(2);
    expect(buckets[6].counts.pdf).toBe(1);
    expect(buckets[6].total).toBe(3);
    expect(buckets[0].counts.pdf).toBe(1);
    expect(buckets.reduce((total, bucket) => total + bucket.total, 0)).toBe(4);
    expect(bucketSummary(buckets[6])).toBe('Martes: 2 imágenes, 1 PDF');
    expect(bucketSummary(buckets[3])).toBe('Sábado: nada');
  });

  it('has a bar a week (from Monday) for the last 4 weeks', () => {
    const buckets = activityBuckets({
      entries : [pdf(new Date(2026, 10, 23, 8)), pdf(new Date(2026, 10, 22, 22)), entry(new Date(2026, 10, 2, 10), { type: 'audio', action: 'transcribe' }), pdf(new Date(2026, 10, 1, 10))],
      tools   : TOOLS,
      range   : 'month',
      now,
    });

    expect(buckets.map((bucket) => bucket.title)).toEqual(['Semana del 2 nov', 'Semana del 9 nov', 'Semana del 16 nov', 'Semana del 23 nov']);
    expect(buckets.map((bucket) => bucket.total)).toEqual([1, 0, 1, 1]);
    expect(buckets[0].counts.media).toBe(1);
    expect(bucketSummary(buckets[0])).toBe('Semana del 2 nov: 1 audio o video');
  });

  it('has a bar a month for the last 6 months, across the year', () => {
    const january = new Date(2027, 0, 10);
    const buckets = activityBuckets({
      entries : [pdf(new Date(2026, 7, 1, 0, 1)), pdf(new Date(2026, 6, 31, 23)), entry(new Date(2026, 11, 31), { type: 'cleanup', action: 'cleanup', path: '' })],
      tools   : TOOLS,
      range   : 'half',
      now     : january,
    });

    expect(buckets.map((bucket) => bucket.title)).toEqual(['Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre', 'Enero']);
    expect(buckets[0].counts.pdf).toBe(1);
    expect(buckets[4].counts.pc).toBe(1);
    expect(bucketSummary(buckets[4])).toBe('Diciembre: 1 tarea en tu PC');
  });

  it('leaves out what no tool made', () => {
    const buckets = activityBuckets({ entries: [entry(now, { action: 'nothing-known' as HistoryEntry['action'] })], tools: TOOLS, range: 'week', now });
    expect(buckets.every((bucket) => bucket.total === 0)).toBe(true);
  });

  it('counts the four numbers for the span on view', () => {
    const entries = [
      entry(new Date(2026, 10, 24, 8), { action: 'compress', type: 'image', saved: 3_000_000 }),
      entry(new Date(2026, 10, 23, 8), { action: 'transcribe', type: 'audio', seconds: 125.5 }),
      entry(new Date(2026, 10, 22, 8), { action: 'cleanup', type: 'cleanup', path: '', saved: 1_000_000 }),
      entry(new Date(2026, 10, 21, 8), { action: 'screen-text', type: 'screen-text', path: '' }),
      entry(new Date(2026, 9, 1, 8), { action: 'merge' }),
    ];

    expect(periodStats(entries, rangeStart('week', now))).toEqual({ files: 2, savedBytes: 4_000_000, audioSeconds: 125.5, screenTexts: 1 });
    expect(periodStats(entries, rangeStart('half', now)).files).toBe(3);
    expect(isEmptyPeriod(periodStats([], rangeStart('week', now)))).toBe(true);
  });
});
