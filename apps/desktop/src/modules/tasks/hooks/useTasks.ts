import { useSyncExternalStore } from 'react';
import type { Task } from '@/modules/tasks/interfaces/task';
import { getTasks, subscribeTasks } from '@/modules/tasks/store/taskStore';

export const useTasks = (): Task[] => useSyncExternalStore(subscribeTasks, getTasks);
