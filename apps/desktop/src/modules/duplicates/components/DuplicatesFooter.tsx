import { formatFileSize } from '@/modules/actions/utils/fileSize';
import { DUPLICATES_TEXTS } from '@/modules/duplicates/constants/texts';
import type { DuplicatesPhase } from '@/modules/duplicates/types/duplicatesPhase';
import type { MarkedTotals } from '@/modules/duplicates/utils/selection';
import { Button } from '@/shared/components/Button';
import { ProgressBar } from '@/shared/components/ProgressBar';

interface DuplicatesFooterProps {
  phase      : DuplicatesPhase;
  totals     : MarkedTotals;
  canScan    : boolean;
  progress   : number | null;
  line       : string | null;
  waiting    : boolean;
  cancelling : boolean;
  onScan     : () => void;
  onAgain    : () => void;
  onCancel   : () => void;
  onRemove   : () => void;
}

const disabledLook = 'disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:brightness-100';

// Always at the bottom: the progress and Cancelar while it works; with results, what is marked and
// «Quitar X»; otherwise «Buscar repetidos».
export const DuplicatesFooter = ({ phase, totals, canScan, progress, line, waiting, cancelling, onScan, onAgain, onCancel, onRemove }: DuplicatesFooterProps) => {
  if (phase === 'scanning' || phase === 'removing') {
    const label = waiting ? DUPLICATES_TEXTS.waiting : line ?? (phase === 'removing' ? DUPLICATES_TEXTS.removing : DUPLICATES_TEXTS.scanning);
    return (
      <footer className="flex shrink-0 items-center gap-3 border-t border-line pt-3">
        <div className="min-w-0 flex-1">
          <p aria-live="polite" className="text-[13px] leading-snug font-semibold text-text">{label}</p>
          <div className="mt-1.5">
            <ProgressBar value={progress} />
          </div>
        </div>
        <Button variant="secondary" onClick={onCancel} disabled={cancelling} className="h-10 shrink-0">
          {cancelling ? DUPLICATES_TEXTS.cancelling : DUPLICATES_TEXTS.cancel}
        </Button>
      </footer>
    );
  }

  if (phase === 'ready') {
    return (
      <footer className="flex shrink-0 items-center gap-3 border-t border-line pt-3">
        <p className="min-w-0 flex-1 text-[13px] text-muted">{DUPLICATES_TEXTS.marked(totals.count, formatFileSize(totals.bytes))}</p>
        <Button variant="secondary" onClick={onAgain} className="h-10 shrink-0">
          {DUPLICATES_TEXTS.scanAgain}
        </Button>
        <Button onClick={onRemove} disabled={totals.count === 0} className={`h-10 shrink-0 ${disabledLook}`}>
          {DUPLICATES_TEXTS.remove(formatFileSize(totals.bytes))}
        </Button>
      </footer>
    );
  }

  return (
    <footer className="flex shrink-0 justify-end border-t border-line pt-3">
      <Button onClick={phase === 'done' ? onAgain : onScan} disabled={phase !== 'done' && !canScan} className={`h-10 ${disabledLook}`}>
        {phase === 'done' ? DUPLICATES_TEXTS.scanAgain : DUPLICATES_TEXTS.scan}
      </Button>
    </footer>
  );
};
