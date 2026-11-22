import { useCallback } from 'react';
import { RESULT_MOODS } from '@/modules/actions/constants/resultMoods';
import type { MascotState } from '@/modules/mascot/types/mascotState';
import { useTaskTransitions } from '@/modules/tasks/hooks/useTaskTransitions';
import { useTasks } from '@/modules/tasks/hooks/useTasks';
import type { Task } from '@/modules/tasks/interfaces/task';

// Glup works while a task runs and reacts to how it ended (happy, confused or calm).
export const useTaskMood = (commandAvatar: (state: MascotState) => void) => {
  const tasks = useTasks();

  const onStart  = useCallback(() => commandAvatar({ type: 'working' }), [commandAvatar]);
  const onFinish = useCallback((task: Task) => {
    if (task.result) commandAvatar(RESULT_MOODS[task.result.tone]);
  }, [commandAvatar]);

  useTaskTransitions({ tasks, onStart, onFinish });
};
