import { PageContent } from '@/modules/main-window/components/PageContent';
import { Sidebar } from '@/modules/main-window/components/Sidebar';
import type { MainPanelState, PanelControlsProps } from '@/modules/main-window/interfaces/mainPanel';
import { TrimPage } from '@/modules/media/pages/TrimPage';
import { OrganizePage } from '@/modules/organize/pages/OrganizePage';
import { ScanPage } from '@/modules/scan/pages/ScanPage';
import { SignPage } from '@/modules/sign/pages/SignPage';
import { SubtitlesPage } from '@/modules/subtitles/pages/SubtitlesPage';
import { WelcomeScreen } from '@/modules/welcome/components/WelcomeScreen';
import type { RefObject } from 'react';

interface MainPanelProps {
  panel           : MainPanelState;
  controls        : PanelControlsProps;
  avatarAnchorRef : RefObject<HTMLDivElement | null>;
}

export const MainPanel = ({ panel, controls, avatarAnchorRef }: MainPanelProps) => (
  <div className="relative flex h-full w-full">
    <Sidebar
      page={panel.page}
      files={panel.files}
      avatarAnchorRef={avatarAnchorRef}
      avatarStatus={panel.avatarStatus}
      onNavigate={panel.navigate}
      hidden={panel.fullScreen}
    />
    {panel.signing && <SignPage target={panel.signing} destination={panel.files.saveLocation.destination} onExit={panel.stopSigning} />}
    {panel.organizing && <OrganizePage target={panel.organizing} destination={panel.files.saveLocation.destination} onExit={panel.stopOrganize} />}
    {panel.scanning && <ScanPage target={panel.scanning} location={panel.files.saveLocation} onExit={panel.stopScan} />}
    {panel.trimming && <TrimPage target={panel.trimming} location={panel.files.saveLocation} onExit={panel.stopTrim} />}
    {panel.subtitling && <SubtitlesPage target={panel.subtitling} location={panel.files.saveLocation} onExit={panel.stopSubtitles} />}
    {!panel.fullScreen && <PageContent page={panel.page} files={panel.files} onNavigate={panel.navigate} controls={controls} />}
    {panel.welcome.visible && <WelcomeScreen onAnswer={panel.welcome.answer} />}
  </div>
);
