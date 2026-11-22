import type { RefObject } from 'react';
import { PrivacyCard } from '@/modules/main-window/components/PrivacyCard';
import { SidebarNav } from '@/modules/main-window/components/SidebarNav';
import { SidebarProfile } from '@/modules/main-window/components/SidebarProfile';
import type { PageId } from '@/modules/main-window/types/pageId';

interface SidebarProps {
  page            : PageId;
  avatarAnchorRef : RefObject<HTMLDivElement | null>;
  avatarStatus    : string;
  onNavigate      : (page: PageId) => void;
  // avatarRef           : RefObject<MascotController | null>;
  // onAvatarStateChange : (state: MascotState) => void;
}

export const Sidebar = ({ page, avatarAnchorRef, avatarStatus, onNavigate }: SidebarProps) => (
  <aside className="flex w-[232px] shrink-0 flex-col px-3.5 pb-4 pt-[18px]">
    {/* <aside className="flex w-[220px] shrink-0 flex-col px-3.5 pb-4 pt-[18px]"> */}
    <SidebarProfile anchorRef={avatarAnchorRef} status={avatarStatus} />
    <SidebarNav page={page} onNavigate={onNavigate} />
    <div className="mt-auto">
      <PrivacyCard />
    </div>
  </aside>
);
