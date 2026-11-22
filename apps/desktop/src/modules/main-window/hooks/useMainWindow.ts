import { useCallback, useMemo, useRef, useState } from 'react';
import { useHomeFiles } from '@/modules/home/hooks/useHomeFiles';
import { DEFAULT_PAGE } from '@/modules/main-window/constants/navigation';
import type { MainPanelState } from '@/modules/main-window/interfaces/mainPanel';
import type { PageId } from '@/modules/main-window/types/pageId';
import { getMascotStatus } from '@/modules/main-window/utils/mascotStatus';
import { IDLE_STATE } from '@/modules/mascot/constants/mascot';
import type { MascotController } from '@/modules/mascot/interfaces/controller';
import type { MascotState } from '@/modules/mascot/types/mascotState';
import { useTaskMood } from '@/modules/tasks/hooks/useTaskMood';

export const useMainWindow = (): MainPanelState => {
  const [page, setPage]               = useState<PageId>(DEFAULT_PAGE);
  const [avatarState, setAvatarState] = useState<MascotState>(IDLE_STATE);
  const avatarRef                     = useRef<MascotController | null>(null);

  const commandAvatar = useCallback((state: MascotState) => avatarRef.current?.setState(state), []);
  const showHome      = useCallback(() => setPage(DEFAULT_PAGE), []);
  const files         = useHomeFiles({ commandAvatar, onFilesIncoming: showHome });

  useTaskMood(commandAvatar);

  const avatarStatus  = useMemo(() => getMascotStatus(avatarState), [avatarState]);
  const filesClose    = files.close;

  // Back to the home page with no pending selection, as when the island collapses.
  const reset = useCallback(() => {
    setPage(DEFAULT_PAGE);
    filesClose();
  }, [filesClose]);

  return {
    page,
    files,
    avatarRef,
    avatarStatus,
    busy                : files.busy || avatarState.type === 'working',
    navigate            : setPage,
    onAvatarStateChange : setAvatarState,
    reset,
  };
};
