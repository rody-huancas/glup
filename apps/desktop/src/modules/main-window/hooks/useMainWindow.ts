import { useExplorerRequests } from '@/modules/explorer/hooks/useExplorerRequests';
import { useHomeFiles } from '@/modules/home/hooks/useHomeFiles';
import { logNav } from '@/modules/island/utils/islandLog';
import { DEFAULT_PAGE } from '@/modules/main-window/constants/navigation';
import type { MainPanelState } from '@/modules/main-window/interfaces/mainPanel';
import type { PageId } from '@/modules/main-window/types/pageId';
import { getMascotStatus } from '@/modules/main-window/utils/mascotStatus';
import { IDLE_STATE } from '@/modules/mascot/constants/mascot';
import type { MascotController } from '@/modules/mascot/interfaces/controller';
import type { MascotState } from '@/modules/mascot/types/mascotState';
import { useTrimMode } from '@/modules/media/hooks/useTrimMode';
import { useOrganizeMode } from '@/modules/organize/hooks/useOrganizeMode';
import { useImageScreen } from '@/modules/photo-tools/hooks/useImageScreen';
import { sendToQrReader } from '@/modules/qr/store/qrInbox';
import { sendToRename } from '@/modules/rename/store/renameInbox';
import { useScanMode } from '@/modules/scan/hooks/useScanMode';
import { useSignMode } from '@/modules/sign/hooks/useSignMode';
import { useSubtitlesMode } from '@/modules/subtitles/hooks/useSubtitlesMode';
import { useTaskMood } from '@/modules/tasks/hooks/useTaskMood';
import { useWelcome } from '@/modules/welcome/hooks/useWelcome';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

export const useMainWindow = (): MainPanelState => {
  const [page, setPage]               = useState<PageId>(DEFAULT_PAGE);
  const [avatarState, setAvatarState] = useState<MascotState>(IDLE_STATE);
  const avatarRef                     = useRef<MascotController | null>(null);

  const commandAvatar = useCallback((state: MascotState) => avatarRef.current?.setState(state), []);
  useEffect(() => {
    logNav(`ruta → ${page}`);
  }, [page]);

  const showHome      = useCallback(() => setPage(DEFAULT_PAGE), []);
  const signMode      = useSignMode();
  const organizeMode  = useOrganizeMode();
  const scanMode      = useScanMode();
  const trimMode      = useTrimMode();
  const subtitlesMode = useSubtitlesMode();
  const imageScreen   = useImageScreen();
  // «Renombrar en lote» with files: the same, to its screen.
  const rename        = useCallback((paths: string[]) => {
    sendToRename(paths);
    setPage('batch-rename');
  }, []);
  // «Leer QR» with files: they wait for the screen in its inbox, and the panel goes there.
  const readQr        = useCallback((paths: string[]) => {
    sendToQrReader({ paths });
    setPage('qr-read');
  }, []);
  const files         = useHomeFiles({ commandAvatar, onFilesIncoming: showHome, onSign: signMode.start, onOrganize: organizeMode.start, onScan: scanMode.start, onTrim: trimMode.start, onSubtitles: subtitlesMode.start, onImages: imageScreen.start, onReadQr: readQr, onRename: rename });

  useTaskMood(commandAvatar);
  useExplorerRequests({ files, onNavigate: setPage });

  const welcome = useWelcome({ onDone: showHome });

  const avatarStatus  = useMemo(() => getMascotStatus(avatarState), [avatarState]);
  const filesClose    = files.close;
  const stopSigning   = signMode.stop;
  const stopOrganize  = organizeMode.stop;
  const stopScan      = scanMode.stop;
  const stopTrim      = trimMode.stop;
  const stopSubtitles = subtitlesMode.stop;
  const stopImages    = imageScreen.stop;

  // Back to the home page with no pending selection, as when the island collapses.
  const reset = useCallback(() => {
    setPage(DEFAULT_PAGE);
    filesClose();
    stopSigning();
    stopOrganize();
    stopScan();
    stopTrim();
    stopSubtitles();
    stopImages();
  }, [filesClose, stopSigning, stopOrganize, stopScan, stopTrim, stopSubtitles, stopImages]);

  const fullScreen = signMode.target !== null || organizeMode.target !== null || scanMode.target !== null || trimMode.target !== null || subtitlesMode.target !== null || imageScreen.target !== null;

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
    trimming            : trimMode.target,
    stopTrim,
    subtitling          : subtitlesMode.target,
    stopSubtitles,
    imaging             : imageScreen.target,
    stopImages,
    fullScreen,
    welcome,
  };
};
