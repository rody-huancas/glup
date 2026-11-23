import { CLIPBOARD_OFF_TEXTS } from '@/modules/clipboard/constants/texts';
import { turnOffBody } from '@/modules/clipboard/utils/turnOff';
import { ConfirmDialog } from '@/shared/components/ConfirmDialog';

interface TurnOffDialogProps {
  count       : number;
  onKeep      : () => void;
  onDeleteAll : () => void;
  // Esc or a click outside: it stays on and nothing is removed.
  onDismiss   : () => void;
}

// After "Apagar" with something kept. "Conservar" is the safe option (first, with the focus).
export const TurnOffDialog = ({ count, onKeep, onDeleteAll, onDismiss }: TurnOffDialogProps) => (
  <ConfirmDialog
    title={CLIPBOARD_OFF_TEXTS.title}
    body={turnOffBody(count)}
    cancel={CLIPBOARD_OFF_TEXTS.keep}
    confirm={CLIPBOARD_OFF_TEXTS.deleteAll}
    onCancel={onKeep}
    onConfirm={onDeleteAll}
    onDismiss={onDismiss}
  />
);
