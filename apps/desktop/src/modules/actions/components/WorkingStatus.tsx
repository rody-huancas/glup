import { ACTIONS_TEXTS } from '@/modules/actions/constants/texts';
import type { ActionProgress } from '@/modules/actions/interfaces/actionReport';
import type { ActionId } from '@/modules/actions/types/actionId';
import { progressDetail, progressFraction, progressLabel } from '@/modules/actions/utils/progressView';
import { Button } from '@/shared/components/Button';
import { ProgressBar } from '@/shared/components/ProgressBar';

interface WorkingStatusProps {
  progress   : ActionProgress | null;
  fileCount  : number;
  // The words of the work itself ("Pasando a texto…"); null for a download alone.
  actionId   : ActionId | null;
  cancelling : boolean;
  onCancel   : () => void;
}

// The stage in plain words ("Descargando lo que necesito…", "Comprobando la descarga…", "Pasando a
// texto…", "Guardando…"). The bar fills only while something is counted; otherwise it moves on its own,
// so it never sits full while the task goes on. Several files add "N de M".
export const WorkingStatus = ({ progress, fileCount, actionId, cancelling, onCancel }: WorkingStatusProps) => {
  const several  = fileCount > 1;
  const detail   = progressDetail(progress);
  const counting = progress?.stage === 'working' && progress.total > 1 && progress.current < progress.total;
  // const value   = detail && progress && progress.total > 0 ? progress.current / progress.total : several ? done / fileCount : null;

  return (
    <div className="flex min-h-[88px] flex-col justify-center gap-2 rounded-control border border-dashed border-line-dashed px-3 py-2.5">
      <div className="flex items-center justify-between gap-2">
        <span role="status" aria-live="polite" className="min-w-0 truncate text-sm font-medium text-lilac-soft">
          {progressLabel({ progress, actionId, cancelling })}
        </span>
        <Button variant="secondary" onClick={onCancel} disabled={cancelling} className="h-8 shrink-0 px-3 text-xs">
          {ACTIONS_TEXTS.cancel}
        </Button>
      </div>
      <ProgressBar value={progressFraction(progress)} />
      {detail && <span className="text-[11px] text-muted">{detail}</span>}
      {several && progress && !detail && counting && (
        <div className="flex items-center justify-between gap-3 text-[11px] text-muted">
          <span className="min-w-0 truncate">{progress.active > 1 ? ACTIONS_TEXTS.parallel(progress.active) : progress.name}</span>
          <span className="shrink-0">{ACTIONS_TEXTS.progressCount(progress.current, progress.total)}</span>
        </div>
      )}
    </div>
  );
};
