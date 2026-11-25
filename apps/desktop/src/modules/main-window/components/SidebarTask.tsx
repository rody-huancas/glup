import { FAMILY_STYLES } from '@/modules/families/constants/families';
import { familyOfTask } from '@/modules/families/utils/families';
import { SIDEBAR_TEXTS } from '@/modules/main-window/constants/sidebar';
import type { PageId } from '@/modules/main-window/types/pageId';
import { useTasks } from '@/modules/tasks/hooks/useTasks';
import { getRunningTask, getTaskFraction } from '@/modules/tasks/utils/taskView';
import { TOOLS } from '@/modules/tools/constants/tools';
import { cx } from '@/shared/utils/classNames';

interface SidebarTaskProps {
  onNavigate : (page: PageId) => void;
}

// The task in progress at the foot of the bar: its name, its percent and a bar in its family's color; a
// click goes to it. With several, how many. Without any, it takes no room.
export const SidebarTask = ({ onNavigate }: SidebarTaskProps) => {
  const tasks   = useTasks().filter((task) => task.status !== 'done');
  const main    = getRunningTask(tasks) ?? tasks[0] ?? null;
  if (!main) return null;

  const family   = familyOfTask(main, TOOLS);
  const style    = family ? FAMILY_STYLES[family] : null;
  const fraction = getTaskFraction(main);
  const percent  = fraction === null ? null : Math.round(fraction * 100);

  return (
    <button
      type="button"
      onClick={() => onNavigate(main.owner)}
      aria-label={SIDEBAR_TEXTS.openTask(main.title)}
      className={cx('mt-3 flex w-full shrink-0 cursor-pointer flex-col gap-1.5 rounded-control border p-2.5 text-left outline-none focus-visible:outline-2 focus-visible:outline-lilac', style ? `${style.dark} ${style.border}` : 'border-line bg-raised')}
    >
      {tasks.length > 1 && <span className={cx('text-[10px] font-bold uppercase', style?.text ?? 'text-mint')}>{SIDEBAR_TEXTS.tasks(tasks.length)}</span>}
      <span className="flex items-center gap-2">
        <span className="min-w-0 flex-1 truncate text-[12px] font-semibold text-text">{main.title}</span>
        {percent !== null && <span className="text-[11px] font-semibold tabular-nums text-muted">{percent} %</span>}
      </span>
      <span aria-hidden className="relative h-1 w-full overflow-hidden rounded-full bg-black/25">
        <span
          className={cx('absolute inset-y-0 left-0 rounded-full', style?.fill ?? 'bg-mint', percent === null ? 'animate-indeterminate w-1/3' : 'transition-[width] duration-300')}
          style={percent === null ? undefined : { width: `${percent}%` }}
        />
      </span>
    </button>
  );
};
