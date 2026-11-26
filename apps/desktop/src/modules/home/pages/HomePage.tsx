import { useState } from 'react';
import { useHistory } from '@/modules/history/hooks/useHistory';
import { ActivityDetail } from '@/modules/home/components/ActivityDetail';
import { DropZone } from '@/modules/home/components/DropZone';
import { HomeActionsCard } from '@/modules/home/components/HomeActionsCard';
import { HomeDashboard } from '@/modules/home/components/HomeDashboard';
import { WeekCard } from '@/modules/home/components/WeekCard';
import type { PageProps } from '@/modules/main-window/interfaces/pageProps';
import { TaskCard } from '@/modules/tasks/components/TaskCard';
import { useTasks } from '@/modules/tasks/hooks/useTasks';
import { tasksForPage } from '@/modules/tasks/utils/taskOwner';
import { getQueuedCount, getVisibleTask } from '@/modules/tasks/utils/taskView';
import { cx } from '@/shared/utils/classNames';

// Inicio fits with no scroll: on top the mint card (the drop zone, with the greeting) and «Esta semana
// hicimos»; then «Atajos», Glup's suggestion, and «Seguir donde quedamos» with «Tu PC». With files chosen
// the card becomes a one-line bar (the same element, so it changes without starting again) and the
// actions take the rest; with a task running, the task does. On the narrow panel everything stacks.
export const HomePage = ({ files, onNavigate }: PageProps) => {
  // Only the tasks Inicio owns (actions on files); others show on their own screen.
  const tasks                 = tasksForPage(useTasks(), 'home');
  const task                  = getVisibleTask(tasks);
  const actionsOpen           = Boolean(files.selection || files.loading);
  const showTask              = !actionsOpen && task !== null;
  const compact               = actionsOpen || showTask;
  const { entries, now }      = useHistory();
  const [detail, setDetail]   = useState(false);

  return (
    <div className="@container flex flex-col gap-3">
      <div className={cx('grid shrink-0 gap-3', !compact && '@2xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]')}>
        <DropZone files={files} compact={compact} />
        {!compact && <WeekCard entries={entries} now={now} onOpen={() => setDetail(true)} />}
      </div>
      {actionsOpen && <HomeActionsCard files={files} />}
      {showTask && task && <TaskCard task={task} queued={getQueuedCount(tasks)} />}
      {!compact && <HomeDashboard files={files} entries={entries} now={now} onNavigate={onNavigate} />}
      {detail && !compact && <ActivityDetail entries={entries} now={now} onClose={() => setDetail(false)} />}
    </div>
  );
};
