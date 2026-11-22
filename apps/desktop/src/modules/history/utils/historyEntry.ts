import type { HistoryEntry } from '@/modules/history/interfaces/historyEntry';
import { formatRelativeDate } from '@/modules/history/utils/relativeDate';

export const getHistoryDetail = (entry: HistoryEntry, now: Date): string =>
  `${entry.detail} · ${formatRelativeDate(entry.date, now)}`;

export const sortByNewest = (entries: HistoryEntry[]): HistoryEntry[] =>
  [...entries].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
