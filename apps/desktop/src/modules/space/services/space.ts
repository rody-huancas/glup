import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { SPACE_TEXTS } from '@/modules/space/constants/texts';
import type { SpacePlace, SpaceView } from '@/modules/space/interfaces/spaceView';
import type { TaskSummary } from '@/modules/tasks/interfaces/taskSummary';
import { ANALYZE_SPACE, GET_SPACE_PLACES, GET_SPACE_VIEW, TRASH_SPACE_ITEM } from '@/shared/constants/events';

export const getSpacePlaces = (): Promise<SpacePlace[]> => invoke<SpacePlace[]>(GET_SPACE_PLACES);

export const analyzeSpace = (root: string, taskId: string): Promise<TaskSummary> => invoke<TaskSummary>(ANALYZE_SPACE, { request: { root, taskId } });

// One folder of what was analyzed (0: the top); it can be asked while the analysis goes.
export const getSpaceView = (id: number): Promise<SpaceView> => invoke<SpaceView>(GET_SPACE_VIEW, { id });

export const trashSpaceItem = (id: number): Promise<SpaceView> => invoke<SpaceView>(TRASH_SPACE_ITEM, { id });

export const pickSpaceFolder = async (): Promise<string | null> => {
  const chosen = await open({ directory: true, multiple: false, title: SPACE_TEXTS.pickTitle });
  return typeof chosen === 'string' ? chosen : null;
};
