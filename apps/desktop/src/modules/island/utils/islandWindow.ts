import { invoke } from '@tauri-apps/api/core';
import type { RegionShape } from '@/modules/dock/interfaces/regionShape';
import type { IslandStatus } from '@/modules/island/interfaces/islandStatus';
import { GET_ISLAND_STATUS, SET_ISLAND_AREA, SET_ISLAND_FOCUS } from '@/shared/constants/events';
import type { Rect } from '@/shared/interfaces/rect';

// Sets the visible and clickable part of the window (CSS pixels of the window), wherever the island is.
// Not clickable (hidden at rest) it is only the zone the cursor tracker watches: the region stays empty.
// Round (the resting bubble), only its circle takes clicks.
export const setIslandArea = async (rect: Rect, shape: RegionShape): Promise<void> => {
  await invoke(SET_ISLAND_AREA, { rect, clickable: shape.clickable, round: shape.round });
};

export const setIslandFocus = async (focused: boolean): Promise<void> => {
  await invoke(SET_ISLAND_FOCUS, { focused });
};

export const getIslandStatus = (): Promise<IslandStatus> => invoke<IslandStatus>(GET_ISLAND_STATUS);
