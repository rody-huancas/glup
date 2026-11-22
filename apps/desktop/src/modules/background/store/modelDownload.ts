import { BACKGROUND_TEXTS } from '@/modules/background/constants/texts';
import { downloadBackgroundModel } from '@/modules/background/services/backgroundModel';
import { enqueueTask, getTasks } from '@/modules/tasks/store/taskStore';
import { summaryToResult } from '@/modules/tasks/utils/taskResult';

// The one download task, so the step finds it again after a remount and never starts a second one.
let downloadId: string | null = null;

export const getModelDownloadId = (): string | null => downloadId;

// A background task owned by Inicio: the island can collapse while it runs.
export const startModelDownload = (): string => {
  const current = getTasks().find((task) => task.id === downloadId && task.status !== 'done');
  if (current) return current.id;

  downloadId = enqueueTask({
    title     : BACKGROUND_TEXTS.taskTitle,
    type      : 'image',
    fileCount : 1,
    owner     : 'home',
    run       : ({ taskId }) => downloadBackgroundModel(taskId).then(summaryToResult),
  });

  return downloadId;
};
