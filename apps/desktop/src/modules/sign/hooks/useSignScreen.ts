import { useCallback, useState } from 'react';
import { SIGN_TEXTS } from '@/modules/sign/constants/sign';
import { useDocumentPages } from '@/modules/sign/hooks/useDocumentPages';
import { useSignatures } from '@/modules/sign/hooks/useSignatures';
import { useSignPlacements } from '@/modules/sign/hooks/useSignPlacements';
import type { SaveSignatureParams } from '@/modules/sign/interfaces/signPdf';
import type { Signature } from '@/modules/sign/interfaces/signature';
import type { SignTarget } from '@/modules/sign/interfaces/signTarget';
import { signPdf } from '@/modules/sign/services/signPdf';
import { formatDate } from '@/modules/sign/utils/date';
import { pagesWithPlacements, toRequests } from '@/modules/sign/utils/placements';
import type { SaveDestination } from '@/modules/settings/interfaces/appSettings';
import { enqueueTask } from '@/modules/tasks/store/taskStore';
import { useKeyDown } from '@/shared/hooks/useKeyDown';

interface UseSignScreenParams {
  target      : SignTarget;
  destination : SaveDestination;
  onExit      : () => void;
}

// The signing screen: pages, what is placed on them, the signatures and the dialogs. Saving queues a
// task like any other action and leaves the screen.
export const useSignScreen = ({ target, destination, onExit }: UseSignScreenParams) => {
  const pages                             = useDocumentPages(target.path);
  const placements                        = useSignPlacements(pages.sizes);
  const signatures                        = useSignatures();
  const [page, setPage]                   = useState(1);
  const [creating, setCreating]           = useState(false);
  const [confirmExit, setConfirmExit]     = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Signature | null>(null);

  const total    = pages.sizes?.length ?? 0;
  const requests = toRequests(placements.placements);
  const select   = placements.select;

  const goTo = useCallback((next: number) => {
    setPage(Math.min(Math.max(next, 1), Math.max(total, 1)));
    select(null);
  }, [total, select]);

  const requestExit = useCallback(() => {
    if (placements.placements.length > 0) setConfirmExit(true);
    else onExit();
  }, [placements.placements.length, onExit]);

  // Esc closes the innermost thing first: a dialog, the text being typed, the selection, then the screen.
  const onEscape = useCallback(() => {
    if (creating) return setCreating(false);
    if (pendingDelete) return setPendingDelete(null);
    if (confirmExit) return setConfirmExit(false);
    if (placements.editingId) return placements.stopEditing();
    if (placements.selectedId) return select(null);
    requestExit();
  }, [creating, pendingDelete, confirmExit, placements, select, requestExit]);

  useKeyDown({ key: 'Escape', enabled: true, handler: onEscape });

  const save = () => {
    if (requests.length === 0) return;

    enqueueTask({
      title     : SIGN_TEXTS.taskTitle(target.name),
      type      : 'pdf',
      fileCount : 1,
      run       : ({ taskId }) => signPdf({ path: target.path, placements: requests, destination, taskId }),
    });
    onExit();
  };

  const createSignature = async (params: SaveSignatureParams) => {
    const signature = await signatures.add(params);

    setCreating(false);
    placements.addSignature(signature, page);
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;

    placements.removeSignature(pendingDelete.id);
    await signatures.remove(pendingDelete).catch(() => undefined);
    setPendingDelete(null);
  };

  return {
    pages,
    page,
    total,
    goTo,
    placements,
    marked         : pagesWithPlacements(placements.placements),
    signatures,
    canSave        : requests.length > 0,
    save,
    requestExit,
    placeSignature : (signature: Signature) => placements.addSignature(signature, page),
    addDate        : () => placements.addText({ text: formatDate(new Date()), page, edit: false }),
    addText        : () => placements.addText({ text: SIGN_TEXTS.defaultText, page, edit: true }),
    creating,
    openCreate     : () => setCreating(true),
    closeCreate    : () => setCreating(false),
    createSignature,
    confirmExit,
    keepSigning    : () => setConfirmExit(false),
    pendingDelete,
    askDelete      : setPendingDelete,
    cancelDelete   : () => setPendingDelete(null),
    confirmDelete,
  };
};
