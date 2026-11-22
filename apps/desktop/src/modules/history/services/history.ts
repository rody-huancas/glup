import { HISTORY_ENTRIES } from '@/modules/history/constants/history';
import type { HistoryEntry } from '@/modules/history/interfaces/historyEntry';
import { sortByNewest } from '@/modules/history/utils/historyEntry';

// Simulates an API until the history is stored by the backend.
export const fetchHistory = async (): Promise<HistoryEntry[]> => sortByNewest(HISTORY_ENTRIES);
