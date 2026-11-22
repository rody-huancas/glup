import type { RefObject } from 'react';
import { PageContent } from '@/modules/main-window/components/PageContent';
import { Sidebar } from '@/modules/main-window/components/Sidebar';
import type { MainPanelState, PanelControlsProps } from '@/modules/main-window/interfaces/mainPanel';

interface MainPanelProps {
  panel           : MainPanelState;
  controls        : PanelControlsProps;
  avatarAnchorRef : RefObject<HTMLDivElement | null>;
}

export const MainPanel = ({ panel, controls, avatarAnchorRef }: MainPanelProps) => (
  <div className="flex h-full w-full">
    <Sidebar
      page={panel.page}
      avatarAnchorRef={avatarAnchorRef}
      avatarStatus={panel.avatarStatus}
      onNavigate={panel.navigate}
    />
    {/* <Sidebar
      page={panel.page}
      avatarRef={panel.avatarRef}
      avatarStatus={panel.avatarStatus}
      onNavigate={panel.navigate}
      onAvatarStateChange={panel.onAvatarStateChange}
    /> */}
    <PageContent page={panel.page} files={panel.files} onNavigate={panel.navigate} controls={controls} />
  </div>
);
