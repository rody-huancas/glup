import { invoke } from '@tauri-apps/api/core';
import type { IslandStatus } from '@/modules/island/interfaces/islandStatus';
import { GET_ISLAND_STATUS, SET_ISLAND_AREA, SET_ISLAND_FOCUS } from '@/shared/constants/events';
import type { Rect } from '@/shared/interfaces/rect';

// Sets the visible and clickable part of the window (CSS pixels of the window), wherever the island is.
// Not clickable (hidden at rest) it is only the zone the cursor tracker watches: the region stays empty.
export const setIslandArea = async (rect: Rect, clickable = true): Promise<void> => {
  await invoke(SET_ISLAND_AREA, { rect, clickable });
};

export const setIslandFocus = async (focused: boolean): Promise<void> => {
  await invoke(SET_ISLAND_FOCUS, { focused });
};

export const getIslandStatus = (): Promise<IslandStatus> => invoke<IslandStatus>(GET_ISLAND_STATUS);
