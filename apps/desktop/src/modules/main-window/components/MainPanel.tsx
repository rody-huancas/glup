import type { RefObject } from 'react';
import { PageContent } from '@/modules/main-window/components/PageContent';
import { Sidebar } from '@/modules/main-window/components/Sidebar';
import type { MainPanelState, PanelControlsProps } from '@/modules/main-window/interfaces/mainPanel';
import { SignPage } from '@/modules/sign/pages/SignPage';

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
      hidden={panel.signing !== null}
    />
    {/* <Sidebar
      page={panel.page}
      avatarRef={panel.avatarRef}
      avatarStatus={panel.avatarStatus}
      onNavigate={panel.navigate}
      onAvatarStateChange={panel.onAvatarStateChange}
    /> */}
    {panel.signing ? (
      <SignPage target={panel.signing} destination={panel.files.saveLocation.destination} onExit={panel.stopSigning} />
    ) : (
      <PageContent page={panel.page} files={panel.files} onNavigate={panel.navigate} controls={controls} />
    )}
    {/* <PageContent page={panel.page} files={panel.files} onNavigate={panel.navigate} controls={controls} /> */}
  </div>
);
