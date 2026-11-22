import { ConfirmGroup } from '@/modules/cleanup/components/ConfirmGroup';
import { CLEANUP_TEXTS } from '@/modules/cleanup/constants/texts';
import type { SelectionTotals } from '@/modules/cleanup/interfaces/selectionTotals';
import { Button } from '@/shared/components/Button';

interface CleanupConfirmProps {
  totals    : SelectionTotals;
  onConfirm : () => void;
  onCancel  : () => void;
}

// Before deleting: what can be recovered and what cannot, each with its total.
export const CleanupConfirm = ({ totals, onConfirm, onCancel }: CleanupConfirmProps) => (
  <div className="absolute inset-0 z-30 flex items-center justify-center rounded-[18px] bg-bg/70" onPointerDown={onCancel}>
    <div
      role="alertdialog"
      aria-modal="true"
      aria-label={CLEANUP_TEXTS.confirmTitle}
      onPointerDown={(event) => event.stopPropagation()}
      className="w-[420px] rounded-[18px] border border-line-strong bg-surface p-5 shadow-2xl"
    >
      <h2 className="text-[15px] font-semibold text-text">{CLEANUP_TEXTS.confirmTitle}</h2>
      <p className="mt-1 text-[12px] text-muted">{CLEANUP_TEXTS.files(totals.files)}</p>
      <ul className="mt-3 flex flex-col gap-2">
        {totals.trash > 0 && <ConfirmGroup label={CLEANUP_TEXTS.toTrash} size={totals.trash} />}
        {totals.direct > 0 && <ConfirmGroup label={CLEANUP_TEXTS.direct} size={totals.direct} />}
        {totals.bin > 0 && <ConfirmGroup label={CLEANUP_TEXTS.emptyBin} size={totals.bin} />}
      </ul>
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="secondary" onClick={onCancel} className="h-9">
          {CLEANUP_TEXTS.keep}
        </Button>
        <Button onClick={onConfirm} className="h-9">
          {CLEANUP_TEXTS.confirm}
        </Button>
      </div>
    </div>
  </div>
);
