import type { IslandNotice } from '@/modules/island/interfaces/islandNotice';
import type { ResultTone } from '@/modules/actions/types/resultTone';
import { AUTO_FOLDERS_DONE_EVENT } from '@/shared/constants/events';
import { useTauriEvent } from '@/shared/hooks/useTauriEvent';

interface AutoFoldersDone {
  message : string;
  tone    : ResultTone;
}

// What the rules did, told once for all of them («Pasé 12 fotos de iPhone a JPG en Descargas»): «Ver»
// opens Carpetas automáticas.
export const useAutoFolderNotices = (onNotice: (notice: IslandNotice) => void) => {
  useTauriEvent<AutoFoldersDone>(AUTO_FOLDERS_DONE_EVENT, ({ message, tone }) => {
    onNotice({ message, tone, page: 'auto-folders' });
  });
};
