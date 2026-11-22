import { invoke } from '@tauri-apps/api/core';
import type { TaskRecord } from '@/modules/tasks/interfaces/taskRecord';
import { DISMISS_TASK, GET_ACTIVE_TASKS } from '@/shared/constants/events';

export const getActiveTasks = (): Promise<TaskRecord[]> => invoke<TaskRecord[]>(GET_ACTIVE_TASKS);

export const dismissTask = (id: string): Promise<void> => invoke(DISMISS_TASK, { id });
