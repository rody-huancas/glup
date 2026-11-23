import { invoke } from '@tauri-apps/api/core';
import type { HistoryEntry } from '@/modules/history/interfaces/historyEntry';
import { sortByNewest } from '@/modules/history/utils/historyEntry';
import { CLEAR_HISTORY, GET_HISTORY } from '@/shared/constants/events';

// Stored by Rust in history.json inside the app data folder.
export const fetchHistory = async (): Promise<HistoryEntry[]> => sortByNewest(await invoke<HistoryEntry[]>(GET_HISTORY));

export const clearHistory = (): Promise<void> => invoke(CLEAR_HISTORY);
