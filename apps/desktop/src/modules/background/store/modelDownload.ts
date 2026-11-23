import type { Learnable } from '@/modules/background/interfaces/learnable';
import type { LearnableId } from '@/modules/background/types/learnableId';
// import { BACKGROUND_TEXTS } from '@/modules/background/constants/texts';
// import { downloadBackgroundModel } from '@/modules/background/services/backgroundModel';
import { enqueueTask, getTasks } from '@/modules/tasks/store/taskStore';
import { summaryToResult } from '@/modules/tasks/utils/taskResult';

// One download task per thing to learn, so the step finds it again after a remount and never starts a second one.
const downloadIds: Partial<Record<LearnableId, string>> = {};
// let downloadId: string | null = null;

export const getModelDownloadId = (id: LearnableId): string | null => downloadIds[id] ?? null;

// A background task owned by Inicio: the island can collapse while it runs.
export const startModelDownload = (learnable: Learnable): string => {
  const current = getTasks().find((task) => task.id === downloadIds[learnable.id] && task.status !== 'done');
  if (current) return current.id;

  const downloadId = enqueueTask({
    title     : learnable.texts.taskTitle,
    type      : learnable.id === 'video' ? 'video' : 'image',
    fileCount : 1,
    owner     : 'home',
    run       : ({ taskId }) => learnable.download(taskId).then(summaryToResult),
  });

  downloadIds[learnable.id] = downloadId;
  return downloadId;
};

// export const startModelDownload = (): string => {
//   const current = getTasks().find((task) => task.id === downloadId && task.status !== 'done');
//   if (current) return current.id;
//
//   downloadId = enqueueTask({
//     title     : BACKGROUND_TEXTS.taskTitle,
//     type      : 'image',
//     fileCount : 1,
//     owner     : 'home',
//     run       : ({ taskId }) => downloadBackgroundModel(taskId).then(summaryToResult),
//   });
//
//   return downloadId;
// };
