// The sample entries are no longer read: the history comes from Rust (get_history).
// import historyJson from '@/modules/history/constants/history.json';
// import type { HistoryEntry } from '@/modules/history/interfaces/historyEntry';
//
// export const HISTORY_ENTRIES = historyJson as HistoryEntry[];

export const RECENT_LIMIT = 5;
// export const RECENT_LIMIT = 3;

export const MISSING_NOTICE_TIME = 2500;

export const HISTORY_TEXTS = {
  title    : 'Historial',
  subtitle : 'Todo lo que hice con tus archivos.',
  recent   : 'Lo último que hice',
  seeAll   : 'Ver todo',
  empty    : 'Todavía no he comido nada.',
  missing  : 'Este archivo ya no está',
};
