import { invoke } from '@tauri-apps/api/core';
import type { ModelStatus } from '@/modules/background/interfaces/modelStatus';
import type { TaskSummary } from '@/modules/tasks/interfaces/taskSummary';
import { DELETE_MODEL, DOWNLOAD_MODEL, GET_BACKGROUND_MODEL } from '@/shared/constants/events';

export const getBackgroundModel = (): Promise<ModelStatus> => invoke<ModelStatus>(GET_BACKGROUND_MODEL);

// Only after the person says yes; resumes a cut download and checks the file.
export const downloadBackgroundModel = (taskId: string): Promise<TaskSummary> => invoke<TaskSummary>(DOWNLOAD_MODEL, { request: { taskId } });

export const deleteBackgroundModel = (): Promise<void> => invoke<void>(DELETE_MODEL);
