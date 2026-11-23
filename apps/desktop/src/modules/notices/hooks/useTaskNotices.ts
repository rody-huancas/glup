import { useCallback, useRef } from 'react';
import type { RefObject } from 'react';
import type { IslandPhase } from '@/modules/island/types/islandPhase';
import { toIslandState } from '@/modules/island/utils/islandMachine';
import type { PageId } from '@/modules/main-window/types/pageId';
import { isGlupInFront, notifyTask } from '@/modules/notices/services/notify';
import { showToast, waitForOpen } from '@/modules/notices/store/toastStore';
import { afterSystem, decideNotice } from '@/modules/notices/utils/noticeDecision';
import type { Task } from '@/modules/tasks/interfaces/task';
import { NOTIFICATION_OPEN_EVENT } from '@/shared/constants/events';
import { useTauriEvent } from '@/shared/hooks/useTauriEvent';

interface UseTaskNoticesParams {
  phaseRef   : RefObject<IslandPhase>;
  // The cursor is over the island.
  insideRef  : RefObject<boolean>;
  onNavigate : (page: PageId) => void;
}

// Tells the end of every task once: the toast in the panel, or a Windows notification when the person
// is not looking (see decideNotice). A click on the notification opens the panel on its owner screen.
export const useTaskNotices = ({ phaseRef, insideRef, onNavigate }: UseTaskNoticesParams) => {
  const startedAt = useRef(new Map<string, number>());

  const onStart = useCallback((task: Task) => {
    startedAt.current.set(task.id, Date.now());
  }, []);

  const onFinish = useCallback((task: Task) => {
    const result = task.result;
    if (!result) return;

    const started   = startedAt.current.get(task.id) ?? task.createdAt;
    const toast     = { taskId: task.id, message: result.message, tone: result.tone, owner: task.owner };
    const panelOpen = () => toIslandState(phaseRef.current) === 'expanded';
    startedAt.current.delete(task.id);

    const tell = async () => {
      const inFront  = await isGlupInFront().catch(() => false);
      const decision = decideNotice({ panelOpen: panelOpen(), attentive: insideRef.current || inFront || document.hasFocus(), durationMs: Date.now() - started });
      const shown    = decision.system ? await notifyTask({ body: result.message, page: task.owner }).catch(() => false) : false;
      const final    = afterSystem({ decision, shown, panelOpen: panelOpen() });

      if (final.toast === 'now') showToast(toast);
      if (final.toast === 'on-open') waitForOpen(toast);
    };

    void tell();
  }, [phaseRef, insideRef]);

  // The notification was clicked: Rust already asked the island to open; here, its screen.
  useTauriEvent<PageId>(NOTIFICATION_OPEN_EVENT, (page) => {
    onNavigate(page);
  });

  return { onStart, onFinish };
};
