import { invoke } from '@tauri-apps/api/core';
import type { IslandDock } from '@/modules/dock/interfaces/islandDock';
import type { IslandScreen } from '@/modules/dock/interfaces/islandScreen';
import { BEGIN_ISLAND_DRAG, GET_ISLAND_SCREENS, SET_ISLAND_DOCK, SET_ISLAND_FRAME } from '@/shared/constants/events';
import type { Rect } from '@/shared/interfaces/rect';

interface SetIslandFrameParams {
  screen : string;
  // The window, in CSS pixels of that screen's work area.
  rect   : Rect;
  // The pill's area within the window, for a reset (tray, capture) to go back to.
  pill   : Rect;
}

export const getIslandScreens = (): Promise<IslandScreen[]> => invoke<IslandScreen[]>(GET_ISLAND_SCREENS);

export const setIslandFrame = (request: SetIslandFrameParams): Promise<void> => invoke(SET_ISLAND_FRAME, { request });

// From here Rust follows the cursor and tells where it goes (island-drag) until the button comes up.
export const beginIslandDrag = (): Promise<void> => invoke(BEGIN_ISLAND_DRAG);

export const setIslandDock = (dock: IslandDock): Promise<void> => invoke(SET_ISLAND_DOCK, { dock });
