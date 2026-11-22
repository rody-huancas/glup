import { useEffect, useRef } from 'react';
import type { Task } from '@/modules/tasks/interfaces/task';
import type { TaskStatus } from '@/modules/tasks/types/taskStatus';

interface UseTaskTransitionsParams {
  tasks      : Task[];
  onStart?   : (task: Task) => void;
  onFinish?  : (task: Task) => void;
}

// Calls back once when a task starts running and once when it finishes.
export const useTaskTransitions = ({ tasks, onStart, onFinish }: UseTaskTransitionsParams) => {
  const previous = useRef(new Map<string, TaskStatus>());
  const startRef  = useRef(onStart);
  const finishRef = useRef(onFinish);

  useEffect(() => {
    startRef.current  = onStart;
    finishRef.current = onFinish;
  }, [onStart, onFinish]);

  useEffect(() => {
    tasks.forEach((task) => {
      const before = previous.current.get(task.id);

      if (task.status === 'running' && before !== 'running') startRef.current?.(task);
      if (task.status === 'done' && before !== undefined && before !== 'done') finishRef.current?.(task);
    });

    previous.current = new Map(tasks.map((task) => [task.id, task.status]));
  }, [tasks]);
};
