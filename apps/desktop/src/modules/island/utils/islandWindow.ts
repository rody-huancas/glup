import { invoke } from '@tauri-apps/api/core';
import { ISLAND_SIZES } from '@/modules/island/constants/island';
import type { VisibleIslandState } from '@/modules/island/types/islandState';
import { RESIZE_ISLAND } from '@/shared/constants/events';

export const resizeIslandWindow = async (target: VisibleIslandState): Promise<void> => {
  const { width, height } = ISLAND_SIZES[target];

  await invoke(RESIZE_ISLAND, { size: { width, height } });
};
