import { useMemo, useState, useSyncExternalStore } from 'react';
import { GROUPS_PAGE } from '@/modules/duplicates/constants/texts';
import { getDuplicates, subscribeDuplicates } from '@/modules/duplicates/store/duplicatesStore';
import type { FileKind } from '@/modules/duplicates/types/fileKind';
import { filterGroups } from '@/modules/duplicates/utils/filters';
import { markedTotals } from '@/modules/duplicates/utils/selection';
import { useTasks } from '@/modules/tasks/hooks/useTasks';
import { useSeenTasks } from '@/modules/tasks/hooks/useSeenTasks';
import { getTaskFraction } from '@/modules/tasks/utils/taskView';

// The screen of "Archivos repetidos": the store, its task's progress, the filters and how many groups show.
export const useDuplicatesScreen = () => {
  const duplicates            = useSyncExternalStore(subscribeDuplicates, getDuplicates);
  const tasks                 = useTasks();
  const task                  = duplicates.taskId ? tasks.find((item) => item.id === duplicates.taskId) ?? null : null;
  const [kind, setKind]       = useState<FileKind>('all');
  const [root, setRoot]       = useState<string | null>(null);
  const [shown, setShown]     = useState(GROUPS_PAGE);
  const [confirming, setConf] = useState(false);

  useSeenTasks('duplicates');

  const groups   = useMemo(() => duplicates.scan?.groups ?? [], [duplicates.scan]);
  const filtered = useMemo(() => filterGroups({ groups, kind, root }), [groups, kind, root]);
  const totals   = useMemo(() => markedTotals(groups, duplicates.marked), [groups, duplicates.marked]);

  return {
    duplicates,
    groups,
    filtered,
    visible      : filtered.slice(0, shown),
    hidden       : Math.max(0, filtered.length - shown),
    showMore     : () => setShown((count) => count + GROUPS_PAGE),
    kind,
    setKind      : (next: FileKind) => { setKind(next); setShown(GROUPS_PAGE); },
    root,
    setRoot      : (next: string | null) => { setRoot(next); setShown(GROUPS_PAGE); },
    totals,
    working      : duplicates.phase === 'scanning' || duplicates.phase === 'removing',
    progress     : task ? getTaskFraction(task) : null,
    progressLine : task?.progress?.detail ?? null,
    waiting      : task?.status === 'queued',
    cancelling   : task?.cancelling ?? false,
    confirming,
    askConfirm   : () => setConf(true),
    closeConfirm : () => setConf(false),
  };
};
