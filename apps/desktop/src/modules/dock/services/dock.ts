import { invoke } from '@tauri-apps/api/core';
import type { IslandDock } from '@/modules/dock/interfaces/islandDock';
import type { IslandModeRequest } from '@/modules/dock/interfaces/islandModeRequest';
import type { IslandScreen } from '@/modules/dock/interfaces/islandScreen';
import type { TaskbarState } from '@/modules/dock/interfaces/taskbarState';
import { BEGIN_ISLAND_DRAG, GET_ISLAND_SCREENS, GET_TASKBAR_STATE, SET_ISLAND_DOCK, SET_ISLAND_FRAME, SET_ISLAND_MODE } from '@/shared/constants/events';
import type { Rect } from '@/shared/interfaces/rect';

interface SetIslandFrameParams {
  screen        : string;
  // The window, in CSS pixels of that screen's work area.
  rect          : Rect;
  // The resting area within the window, for a reset (tray, capture) to go back to; hidden at rest it is
  // only the reveal zone and takes no clicks.
  pill          : Rect;
  pillClickable : boolean;
}



export const getIslandScreens = (): Promise<IslandScreen[]> => invoke<IslandScreen[]>(GET_ISLAND_SCREENS);

export const setIslandFrame = (request: SetIslandFrameParams): Promise<void> => invoke(SET_ISLAND_FRAME, { request });

// From here Rust follows the cursor and tells where it goes (island-drag) until the button comes up.
export const beginIslandDrag = (): Promise<void> => invoke(BEGIN_ISLAND_DRAG);

export const setIslandDock = (dock: IslandDock): Promise<void> => invoke(SET_ISLAND_DOCK, { dock });

// "Cómo se muestra": what is not sent stays as it was.
export const setIslandMode = (request: IslandModeRequest): Promise<void> => invoke(SET_ISLAND_MODE, { request });

export const getTaskbarState = (): Promise<TaskbarState> => invoke<TaskbarState>(GET_TASKBAR_STATE);
