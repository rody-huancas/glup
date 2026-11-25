import { useCallback, useEffect, useRef, useState } from 'react';
import { SPACE_TEXTS, POLL_EVERY } from '@/modules/space/constants/texts';
import type { SpacePlace, SpaceView } from '@/modules/space/interfaces/spaceView';
import { analyzeSpace, getSpacePlaces, getSpaceView, trashSpaceItem } from '@/modules/space/services/space';
import { summaryToResult } from '@/modules/tasks/utils/taskResult';
import { useTasks } from '@/modules/tasks/hooks/useTasks';
import { enqueueTask } from '@/modules/tasks/store/taskStore';

// "Qué ocupa espacio": where to look (Tu carpeta by default), the analysis as a task (Cancelar in it),
// the folder shown (asked again while it goes, so the map grows) and sending things to the bin.
export const useSpace = () => {
  const [places, setPlaces]   = useState<SpacePlace[]>([]);
  const [root, setRoot]       = useState<string | null>(null);
  const [taskId, setTaskId]   = useState<string | null>(null);
  const [folderId, setFolder] = useState(0);
  const [view, setView]       = useState<SpaceView | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const tasks                 = useTasks();
  const task                  = tasks.find((each) => each.id === taskId) ?? null;
  const running               = task !== null && task.status !== 'done';
  const folderRef             = useRef(folderId);
  folderRef.current           = folderId;

  useEffect(() => {
    void getSpacePlaces().then((found) => {
      setPlaces(found);
      setRoot((current) => current ?? found[0]?.path ?? null);
    }).catch(() => undefined);
    // What was analyzed before (still in Glup's memory) shows again.
    void getSpaceView(0).then(setView).catch(() => undefined);
  }, []);

  const refresh = useCallback((id = folderRef.current) => {
    void getSpaceView(id).then((next) => {
      setView(next);
      if (next.folder.id !== id) setFolder(next.folder.id);
    }).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => refresh(), POLL_EVERY);
    return () => window.clearInterval(timer);
  }, [running, refresh]);
  useEffect(() => {
    if (task?.status === 'done') refresh();
  }, [task?.status, refresh]);

  const analyze = () => {
    if (!root) return;
    setFolder(0);
    setView(null);
    setProblem(null);
    setTaskId(enqueueTask({
      title     : `${SPACE_TEXTS.title} · ${places.find((place) => place.path === root)?.label ?? root}`,
      actionId  : null,
      type      : null,
      fileCount : 0,
      owner     : 'space',
      run       : ({ taskId: id }) => analyzeSpace(root, id).then(summaryToResult),
    }));
  };

  const enter = (id: number) => {
    setFolder(id);
    refresh(id);
  };

  const trash = (id: number) => {
    setProblem(null);
    void trashSpaceItem(id).then((next) => {
      setView(next);
      setFolder(next.folder.id);
    }).catch((failure: unknown) => setProblem(String(failure)));
  };

  return { places, root, setRoot, analyze, running, queued: task?.status === 'queued', progress: task?.progress?.detail ?? null, view, enter, trash, problem };
};
