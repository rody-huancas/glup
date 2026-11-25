import { useCallback, useMemo, useRef, useState } from 'react';
import { useHomeFiles } from '@/modules/home/hooks/useHomeFiles';
import { DEFAULT_PAGE } from '@/modules/main-window/constants/navigation';
import type { MainPanelState } from '@/modules/main-window/interfaces/mainPanel';
import type { PageId } from '@/modules/main-window/types/pageId';
import { getMascotStatus } from '@/modules/main-window/utils/mascotStatus';
import { IDLE_STATE } from '@/modules/mascot/constants/mascot';
import type { MascotController } from '@/modules/mascot/interfaces/controller';
import type { MascotState } from '@/modules/mascot/types/mascotState';
import { useOrganizeMode } from '@/modules/organize/hooks/useOrganizeMode';
import { useScanMode } from '@/modules/scan/hooks/useScanMode';
import { useSignMode } from '@/modules/sign/hooks/useSignMode';
import { useTaskMood } from '@/modules/tasks/hooks/useTaskMood';
import { useWelcome } from '@/modules/welcome/hooks/useWelcome';

export const useMainWindow = (): MainPanelState => {
  const [page, setPage]               = useState<PageId>(DEFAULT_PAGE);
  const [avatarState, setAvatarState] = useState<MascotState>(IDLE_STATE);
  const avatarRef                     = useRef<MascotController | null>(null);

  const commandAvatar = useCallback((state: MascotState) => avatarRef.current?.setState(state), []);
  const showHome      = useCallback(() => setPage(DEFAULT_PAGE), []);
  const signMode      = useSignMode();
  const organizeMode  = useOrganizeMode();
  const scanMode      = useScanMode();
  const files         = useHomeFiles({ commandAvatar, onFilesIncoming: showHome, onSign: signMode.start, onOrganize: organizeMode.start, onScan: scanMode.start });

  useTaskMood(commandAvatar);

  const welcome = useWelcome({ onDone: showHome });

  const avatarStatus  = useMemo(() => getMascotStatus(avatarState), [avatarState]);
  const filesClose    = files.close;
  const stopSigning   = signMode.stop;
  const stopOrganize  = organizeMode.stop;
  const stopScan      = scanMode.stop;

  // Back to the home page with no pending selection, as when the island collapses.
  const reset = useCallback(() => {
    setPage(DEFAULT_PAGE);
    filesClose();
    stopSigning();
    stopOrganize();
    stopScan();
  }, [filesClose, stopSigning, stopOrganize, stopScan]);

  const fullScreen = signMode.target !== null || organizeMode.target !== null || scanMode.target !== null;

  return {
    page,
    files,
    avatarRef,
    avatarStatus,
    // Signing, organizing and scanning keep the island open until saved or cancelled.
    busy                : files.busy || fullScreen,
    navigate            : setPage,
    onAvatarStateChange : setAvatarState,
    reset,
    discardSelection    : filesClose,
    signing             : signMode.target,
    stopSigning,
    organizing          : organizeMode.target,
    stopOrganize,
    scanning            : scanMode.target,
    stopScan,
    fullScreen,
    welcome,
  };
};
