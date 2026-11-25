import { invoke } from '@tauri-apps/api/core';
import type { ExplorerRequest } from '@/modules/explorer/interfaces/explorerRequest';
import { OPEN_ISLAND, SET_EXPLORER_MENU, SET_SEND_TO, TAKE_EXPLORER_REQUESTS } from '@/shared/constants/events';

// What came from the Explorer and is ready; each request is taken once.
export const takeExplorerRequests = (): Promise<ExplorerRequest[]> => invoke<ExplorerRequest[]>(TAKE_EXPLORER_REQUESTS);

export const setExplorerMenu = (enabled: boolean): Promise<void> => invoke(SET_EXPLORER_MENU, { enabled });

export const setSendTo = (enabled: boolean): Promise<void> => invoke(SET_SEND_TO, { enabled });

// The island opens on its panel (shown even if it was hidden in the tray).
export const openIsland = (): Promise<void> => invoke(OPEN_ISLAND);
