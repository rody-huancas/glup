import { useCallback, useEffect, useMemo, useState } from 'react';
import { EXPIRY_CHECK_MS } from '@/modules/cleanup/constants/categories';
import { useCleanup } from '@/modules/cleanup/hooks/useCleanup';
import { useCleanupTask } from '@/modules/cleanup/hooks/useCleanupTask';
import { useDiskSpace } from '@/modules/cleanup/hooks/useDiskSpace';
import {
  cancelCurrent,
  expireCleanupResult,
  resetCleanup,
  setCleanupViewing,
  startClean,
  startScan,
  toggleCleanupCategory,
  toggleCleanupExpanded,
  toggleCleanupItem,
} from '@/modules/cleanup/store/cleanupStore';
import { displayOrder } from '@/modules/cleanup/utils/displayOrder';
import { selectionTotals } from '@/modules/cleanup/utils/selection';
import { useIslandHold } from '@/modules/island/hooks/useIslandHold';
import { useSeenTasks } from '@/modules/tasks/hooks/useSeenTasks';
import { getTaskFraction } from '@/modules/tasks/utils/taskView';

// The Limpieza page. Everything that must survive leaving it (scan, marks, open cards) is in the store;
// only the confirmation dialog is local.
export const useCleanupScreen = () => {
  const cleanup                  = useCleanup();
  const disk                     = useDiskSpace(cleanup.diskRead);
  const task                     = useCleanupTask(cleanup.taskId);
  const [confirming, setConfirm] = useState(false);

  // Its result is the category list: a finished scan or cleaning is seen as soon as the page is on.
  useSeenTasks('cleanup');
  // The confirmation keeps the island open.
  useIslandHold(confirming);

  useEffect(() => {
    setCleanupViewing(true);
    return () => setCleanupViewing(false);
  }, []);

  useEffect(() => {
    expireCleanupResult(Date.now());

    const timer = window.setInterval(() => expireCleanupResult(Date.now()), EXPIRY_CHECK_MS);
    return () => window.clearInterval(timer);
  }, []);

  const totals = useMemo(() => selectionTotals(cleanup.categories, cleanup.selected), [cleanup.categories, cleanup.selected]);
  const order  = useMemo(() => displayOrder(cleanup.categories, cleanup.phase === 'scanning'), [cleanup.categories, cleanup.phase]);

  // From the result, "Revisar de nuevo" starts over.
  const scan = useCallback(() => {
    if (cleanup.phase === 'done') resetCleanup();
    startScan();
  }, [cleanup.phase]);

  const confirm = useCallback(() => {
    setConfirm(false);
    startClean();
  }, []);

  return {
    cleanup,
    disk,
    totals,
    order,
    working        : cleanup.phase === 'scanning' || cleanup.phase === 'cleaning',
    progress       : task ? getTaskFraction(task) : null,
    progressName   : task?.progress?.name ?? '',
    // Files done and in all, for "Borrando 1.240 de 8.300…".
    progressCount  : { current: task?.progress?.current ?? 0, total: task?.progress?.total ?? 0 },
    waiting        : task?.status === 'queued',
    cancelling     : task?.cancelling ?? false,
    confirming,
    askConfirm     : () => setConfirm(true),
    closeConfirm   : () => setConfirm(false),
    confirm,
    scan,
    cancel         : cancelCurrent,
    toggleExpanded : toggleCleanupExpanded,
    toggleCategory : toggleCleanupCategory,
    toggleItem     : toggleCleanupItem,
  };
};
