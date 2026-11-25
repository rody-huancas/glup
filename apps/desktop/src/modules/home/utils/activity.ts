import { FAMILY_IDS } from '@/modules/families/constants/families';
import type { FamilyId } from '@/modules/families/types/familyId';
import type { HistoryEntry } from '@/modules/history/interfaces/historyEntry';
import { ACTIVITY_BARS, ACTIVITY_LOCALE, ACTIVITY_TEXTS, FAMILY_UNITS } from '@/modules/home/constants/activity';
import type { ActivityBucket } from '@/modules/home/interfaces/activityBucket';
import type { PeriodStats } from '@/modules/home/interfaces/periodStats';
import type { ActivityRange } from '@/modules/home/types/activityRange';
import { toolOfEntry } from '@/modules/home/utils/quickTools';
import type { Tool } from '@/modules/tools/types/tool';
import { formatCount } from '@/shared/utils/numbers';

const DAYS_IN_WEEK = 7;

const capitalize = (text: string): string => text.charAt(0).toUpperCase() + text.slice(1);

const dayStart = (date: Date): Date => new Date(date.getFullYear(), date.getMonth(), date.getDate());

// Monday, at the start of the day.
const weekStart = (date: Date): Date => {
  const day = dayStart(date);
  day.setDate(day.getDate() - ((day.getDay() + 6) % DAYS_IN_WEEK));
  return day;
};

const addDays = (date: Date, days: number): Date => new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);

const format = (date: Date, options: Intl.DateTimeFormatOptions): string => new Intl.DateTimeFormat(ACTIVITY_LOCALE, options).format(date).replace('.', '');

interface Span {
  start : Date;
  end   : Date;
  label : string;
  title : string;
}

// The spans of a range, oldest first, the last one holding now (days and months as the calendar has
// them, weeks from Monday).
export const activitySpans = (range: ActivityRange, now: Date): Span[] => {
  const count = ACTIVITY_BARS[range];

  return Array.from({ length: count }, (_, index) => {
    const back = count - 1 - index;

    if (range === 'week') {
      const start = addDays(dayStart(now), -back);
      return { start, end: addDays(start, 1), label: format(start, { weekday: 'short' }), title: capitalize(format(start, { weekday: 'long' })) };
    }
    if (range === 'month') {
      const start = addDays(weekStart(now), -back * DAYS_IN_WEEK);
      const day   = format(start, { day: 'numeric', month: 'short' });
      return { start, end: addDays(start, DAYS_IN_WEEK), label: day, title: ACTIVITY_TEXTS.week(day) };
    }
    const start = new Date(now.getFullYear(), now.getMonth() - back, 1);
    return { start, end: new Date(start.getFullYear(), start.getMonth() + 1, 1), label: format(start, { month: 'short' }), title: capitalize(format(start, { month: 'long' })) };
  });
};

const emptyCounts = (): Record<FamilyId, number> =>
  Object.fromEntries(FAMILY_IDS.map((family) => [family, 0])) as Record<FamilyId, number>;

interface ActivityParams {
  entries : HistoryEntry[];
  tools   : Tool[];
  range   : ActivityRange;
  now     : Date;
}

// One bar per span, stacked by family: each entry of the Historial counts once, in the family of the tool
// that made it (an entry whose tool is unknown is left out).
export const activityBuckets = ({ entries, tools, range, now }: ActivityParams): ActivityBucket[] => {
  const buckets = activitySpans(range, now).map((span): ActivityBucket => ({
    start  : span.start.getTime(),
    end    : span.end.getTime(),
    label  : span.label,
    title  : span.title,
    counts : emptyCounts(),
    total  : 0,
  }));

  entries.forEach((entry) => {
    const at     = Date.parse(entry.date);
    const bucket = buckets.find((item) => at >= item.start && at < item.end);
    const family = bucket ? toolOfEntry(entry, tools)?.family : undefined;
    if (!bucket || !family) return;
    bucket.counts[family] += 1;
    bucket.total          += 1;
  });

  return buckets;
};

// "Martes: 12 imágenes, 3 PDF" (or "Martes: nada").
export const bucketSummary = (bucket: ActivityBucket): string => {
  const parts = FAMILY_IDS.filter((family) => bucket.counts[family] > 0).map((family) => {
    const count = bucket.counts[family];
    return `${formatCount(count)} ${FAMILY_UNITS[family][count === 1 ? 0 : 1]}`;
  });
  return `${bucket.title}: ${parts.length > 0 ? parts.join(', ') : ACTIVITY_TEXTS.nothing}`;
};

// Since the start of the first span (for the numbers over the chart).
export const rangeStart = (range: ActivityRange, now: Date): number => activitySpans(range, now)[0].start.getTime();

// Files made, bytes saved (reduced files, cleanings), seconds of audio passed to text and texts copied
// from the screen, since a moment.
export const periodStats = (entries: HistoryEntry[], since: number): PeriodStats => {
  const period = entries.filter((entry) => Date.parse(entry.date) >= since);

  return {
    files        : period.filter((entry) => entry.path !== '').length,
    savedBytes   : period.reduce((total, entry) => total + (entry.saved ?? 0), 0),
    audioSeconds : period.reduce((total, entry) => total + (entry.seconds ?? 0), 0),
    screenTexts  : period.filter((entry) => entry.action === 'screen-text').length,
  };
};

export const isEmptyPeriod = (stats: PeriodStats): boolean =>
  stats.files === 0 && stats.savedBytes === 0 && stats.audioSeconds === 0 && stats.screenTexts === 0;
