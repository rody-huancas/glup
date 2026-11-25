import { useCallback } from 'react';
import type { RefObject } from 'react';
import { familyOfTask, familyPage } from '@/modules/families/utils/families';
import type { HomeFiles } from '@/modules/home/interfaces/homeFiles';
import { SidebarFavorites } from '@/modules/main-window/components/SidebarFavorites';
import { SidebarNav } from '@/modules/main-window/components/SidebarNav';
import { SidebarProfile } from '@/modules/main-window/components/SidebarProfile';
import { SidebarSearch } from '@/modules/main-window/components/SidebarSearch';
import { SidebarSettings } from '@/modules/main-window/components/SidebarSettings';
import { SidebarTask } from '@/modules/main-window/components/SidebarTask';
import type { SearchResult } from '@/modules/main-window/interfaces/searchResult';
import type { PageId } from '@/modules/main-window/types/pageId';
import { useTasks } from '@/modules/tasks/hooks/useTasks';
import { getRunningTask } from '@/modules/tasks/utils/taskView';
import { TOOLS } from '@/modules/tools/constants/tools';
import { useToolRunner } from '@/modules/tools/hooks/useToolRunner';
import { cx } from '@/shared/utils/classNames';

interface SidebarProps {
  page            : PageId;
  files           : HomeFiles;
  avatarAnchorRef : RefObject<HTMLDivElement | null>;
  avatarStatus    : string;
  onNavigate      : (page: PageId) => void;
  // Hidden while signing; it stays mounted because the avatar box is where Glup lands.
  hidden?         : boolean;
}

// From the top: Glup with its state, the search (Ctrl+K), Inicio, Habilidades and Historial, the
// favorites, then the free room, the task in progress, Ajustes and «Todo en tu PC». Glup, the search and
// the foot never move; the middle scrolls when the bar is short (small screens, the island on a side).
export const Sidebar = ({ page, files, avatarAnchorRef, avatarStatus, onNavigate, hidden = false }: SidebarProps) => {
  const running = getRunningTask(useTasks());
  const family  = running ? familyOfTask(running, TOOLS) : null;
  const runTool = useToolRunner({ runTool: files.runTool, onNavigate });

  const open = useCallback((result: SearchResult) => {
    if (result.kind === 'tool') return runTool(result.tool);
    if (result.kind === 'family') return onNavigate(familyPage(result.family));
    if (result.kind === 'setting') return onNavigate('settings');
    onNavigate('tools');
  }, [runTool, onNavigate]);

  return (
    <aside className={cx('h-full w-[232px] shrink-0 flex-col px-3.5 pt-[18px] pb-3', hidden ? 'hidden' : 'flex')}>
      <SidebarProfile anchorRef={avatarAnchorRef} status={avatarStatus} family={family} />
      <SidebarSearch onChoose={open} />
      <div className="scroll-thin -mx-1.5 min-h-0 flex-1 overflow-y-auto px-1.5">
        <SidebarNav page={page} onNavigate={onNavigate} />
        <SidebarFavorites onRun={runTool} />
      </div>
      <SidebarTask onNavigate={onNavigate} />
      <SidebarSettings page={page} onNavigate={onNavigate} />
    </aside>
  );
};
