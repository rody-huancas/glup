import type { RefObject } from 'react';
import type { HomeFiles } from '@/modules/home/interfaces/homeFiles';
import type { PageId } from '@/modules/main-window/types/pageId';
import type { MascotController } from '@/modules/mascot/interfaces/controller';
import type { MascotState } from '@/modules/mascot/types/mascotState';

export interface MainPanelState {
  page                : PageId;
  files               : HomeFiles;
  avatarRef           : RefObject<MascotController | null>;
  avatarStatus        : string;
  busy                : boolean;
  navigate            : (page: PageId) => void;
  onAvatarStateChange : (state: MascotState) => void;
  reset               : () => void;
}

export interface PanelControlsProps {
  pinned      : boolean;
  onTogglePin : () => void;
  onCollapse  : () => void;
}
