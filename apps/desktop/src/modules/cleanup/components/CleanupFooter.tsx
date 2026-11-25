import { CLEANUP_TEXTS } from '@/modules/cleanup/constants/texts';
import type { SelectionTotals } from '@/modules/cleanup/interfaces/selectionTotals';
import type { CleanupPhase } from '@/modules/cleanup/types/cleanupPhase';
import { cleaningLabel } from '@/modules/cleanup/utils/progressText';
import { formatFileSize } from '@/modules/actions/utils/fileSize';
import { Button } from '@/shared/components/Button';
import { ProgressBar } from '@/shared/components/ProgressBar';

interface CleanupFooterProps {
  phase      : CleanupPhase;
  totals     : SelectionTotals;
  progress   : number | null;
  name       : string;
  count      : { current: number; total: number };
  waiting    : boolean;
  cancelling : boolean;
  onScan     : () => void;
  onCancel   : () => void;
  onFree     : () => void;
}

const disabledLook = 'disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:brightness-100';

// Always at the bottom: while working, the progress and Cancelar; with a result, what is marked and
// "Liberar X"; otherwise "Revisar mi PC".
export const CleanupFooter = ({ phase, totals, progress, name, count, waiting, cancelling, onScan, onCancel, onFree }: CleanupFooterProps) => {
  if (phase === 'scanning' || phase === 'cleaning') {
    const label = waiting ? CLEANUP_TEXTS.waiting : phase === 'cleaning' ? cleaningLabel({ ...count, name }) : CLEANUP_TEXTS.scanning(name);

    return (
      <footer className="flex shrink-0 items-center gap-3 border-t border-line pt-3">
        <div className="min-w-0 flex-1">
          <p aria-live="polite" className="text-[13px] font-semibold leading-snug text-text">{label}</p>
          <div className="mt-1.5">
            <ProgressBar value={progress} />
          </div>
        </div>
        <Button variant="secondary" onClick={onCancel} disabled={cancelling} className="h-10 shrink-0">
          {cancelling ? CLEANUP_TEXTS.cancelling : CLEANUP_TEXTS.cancel}
        </Button>
      </footer>
    );
  }

  if (phase === 'ready') {
    return (
      <footer className="flex shrink-0 items-center gap-3 border-t border-line pt-3">
        <p className="min-w-0 flex-1 text-[13px] text-muted">{CLEANUP_TEXTS.marked(totals.files + (totals.bin > 0 ? 1 : 0))}</p>
        <Button variant="secondary" onClick={onScan} className="h-10 shrink-0">
          {CLEANUP_TEXTS.scanAgain}
        </Button>
        <Button onClick={onFree} disabled={totals.total === 0} className={`h-10 shrink-0 ${disabledLook}`}>
          {CLEANUP_TEXTS.free(formatFileSize(totals.total))}
        </Button>
      </footer>
    );
  }

  return (
    <footer className="flex shrink-0 justify-end border-t border-line pt-3">
      <Button onClick={onScan} className="h-10">
        {phase === 'idle' ? CLEANUP_TEXTS.scan : CLEANUP_TEXTS.scanAgain}
      </Button>
    </footer>
  );
};
