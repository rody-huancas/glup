import type { RefObject } from 'react';
import type { HomeFiles } from '@/modules/home/interfaces/homeFiles';
import type { PageId } from '@/modules/main-window/types/pageId';
import type { MascotController } from '@/modules/mascot/interfaces/controller';
import type { MascotState } from '@/modules/mascot/types/mascotState';
import type { TrimTarget } from '@/modules/media/interfaces/trimTarget';
import type { OrganizeTarget } from '@/modules/organize/interfaces/organizeTarget';
import type { ScanTarget } from '@/modules/scan/interfaces/scanTarget';
import type { SignTarget } from '@/modules/sign/interfaces/signTarget';
import type { WelcomeState } from '@/modules/welcome/interfaces/welcomeState';

export interface MainPanelState {
  page                : PageId;
  files               : HomeFiles;
  avatarRef           : RefObject<MascotController | null>;
  avatarStatus        : string;
  busy                : boolean;
  navigate            : (page: PageId) => void;
  onAvatarStateChange : (state: MascotState) => void;
  reset               : () => void;
  // Collapsing only drops a file selection not run yet; sections keep their state.
  discardSelection    : () => void;
  // The PDF being signed: the panel shows the signing screen, full width.
  signing             : SignTarget | null;
  stopSigning         : () => void;
  // The PDF whose pages are being organized: its screen, full width too.
  organizing          : OrganizeTarget | null;
  stopOrganize        : () => void;
  // The photos of sheets being scanned: their screen, full width too.
  scanning            : ScanTarget | null;
  stopScan            : () => void;
  // The audio or video being trimmed: its screen, full width too.
  trimming            : TrimTarget | null;
  stopTrim            : () => void;
  // Signing, organizing or scanning: no sidebar, and the island stays open.
  fullScreen          : boolean;
  // First run: the welcome covers the panel until it is answered.
  welcome             : WelcomeState;
}

export interface PanelControlsProps {
  pinned      : boolean;
  onTogglePin : () => void;
  onCollapse  : () => void;
}
