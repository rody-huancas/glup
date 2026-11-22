import { invoke } from '@tauri-apps/api/core';
import type { WindowSize } from '@/modules/island/interfaces/islandLayout';
import type { IslandStatus } from '@/modules/island/interfaces/islandStatus';
import { GET_ISLAND_STATUS, SET_ISLAND_AREA, SET_ISLAND_FOCUS } from '@/shared/constants/events';

// export const resizeIslandWindow = async ({ width, height }: WindowSize): Promise<void> => {
//   await invoke(RESIZE_ISLAND, { size: { width, height } });
// };

// Sets the visible and clickable part of the window, anchored top center.
export const setIslandArea = async ({ width, height }: WindowSize): Promise<void> => {
  await invoke(SET_ISLAND_AREA, { size: { width, height } });
};

export const setIslandFocus = async (focused: boolean): Promise<void> => {
  await invoke(SET_ISLAND_FOCUS, { focused });
};

export const getIslandStatus = (): Promise<IslandStatus> => invoke<IslandStatus>(GET_ISLAND_STATUS);
