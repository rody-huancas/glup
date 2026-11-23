import { useCallback, useState } from 'react';
import type { ClipboardStatus } from '@/modules/clipboard/interfaces/clipboardStatus';
import { listClips, removeClips, setClipboardEnabled } from '@/modules/clipboard/services/clipboard';
import type { TurnOffChoice } from '@/modules/clipboard/types/turnOffChoice';
import { askBeforeTurningOff, turnOffOutcome } from '@/modules/clipboard/utils/turnOff';
import { useIslandHold } from '@/modules/island/hooks/useIslandHold';

interface UseTurnOffClipboardParams {
  status : ClipboardStatus | null;
  // Where the new status goes (useClipboardStatus's apply).
  apply  : (work: Promise<ClipboardStatus>) => void;
}

// On or off from the screen or from Ajustes. Off with something kept asks first (see turnOffOutcome):
// "Conservar" turns it off and keeps everything, "Borrar todo" turns it off and removes everything
// (pinned included), Esc or a click outside leave it on.
export const useTurnOffClipboard = ({ status, apply }: UseTurnOffClipboardParams) => {
  const [asking, setAsking] = useState(false);

  // The dialog keeps the island open while it is on screen.
  useIslandHold(asking);

  const setEnabled = useCallback((enabled: boolean) => {
    if (!enabled && askBeforeTurningOff(status?.count ?? 0)) return setAsking(true);
    apply(setClipboardEnabled(enabled));
  }, [status, apply]);

  // Off first, so nothing new comes in while it is being emptied; the empty search lists everything.
  const choose = useCallback((choice: TurnOffChoice) => {
    const outcome = turnOffOutcome(choice);
    setAsking(false);

    if (outcome.enabled) return;
    if (!outcome.deleteAll) return apply(setClipboardEnabled(false));

    apply(
      setClipboardEnabled(false)
        .then(() => listClips(''))
        .then((clips) => removeClips(clips.map((clip) => clip.id)))
        .then(() => setClipboardEnabled(false)),
    );
  }, [apply]);

  return {
    asking,
    count     : status?.count ?? 0,
    setEnabled,
    keep      : () => choose('keep'),
    deleteAll : () => choose('delete'),
    dismiss   : () => choose('dismiss'),
  };
};
