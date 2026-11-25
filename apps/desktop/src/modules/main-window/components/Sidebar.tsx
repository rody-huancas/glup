import type { RefObject } from 'react';
import { familyOfTask } from '@/modules/families/utils/families';
import { PrivacyCard } from '@/modules/main-window/components/PrivacyCard';
import { SidebarNav } from '@/modules/main-window/components/SidebarNav';
import { SidebarProfile } from '@/modules/main-window/components/SidebarProfile';
import type { PageId } from '@/modules/main-window/types/pageId';
import { useTasks } from '@/modules/tasks/hooks/useTasks';
import { getRunningTask } from '@/modules/tasks/utils/taskView';
import { TOOLS } from '@/modules/tools/constants/tools';
import { cx } from '@/shared/utils/classNames';

interface SidebarProps {
  page            : PageId;
  avatarAnchorRef : RefObject<HTMLDivElement | null>;
  avatarStatus    : string;
  onNavigate      : (page: PageId) => void;
  // Hidden while signing; it stays mounted because the avatar box is where Glup lands.
  hidden?         : boolean;
}

// Glup with its state on top (in the color of the tool working, while one does), then the four screens.
export const Sidebar = ({ page, avatarAnchorRef, avatarStatus, onNavigate, hidden = false }: SidebarProps) => {
  const running = getRunningTask(useTasks());
  const family  = running ? familyOfTask(running, TOOLS) : null;

  return (
    <aside className={cx('w-[232px] shrink-0 flex-col px-3.5 pb-4 pt-[18px]', hidden ? 'hidden' : 'flex')}>
      <SidebarProfile anchorRef={avatarAnchorRef} status={avatarStatus} family={family} />
      <SidebarNav page={page} onNavigate={onNavigate} />
      <div className="mt-auto">
        <PrivacyCard />
      </div>
    </aside>
  );
};
