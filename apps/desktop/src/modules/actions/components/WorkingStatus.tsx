import { ACTIONS_TEXTS } from '@/modules/actions/constants/texts';
import type { ActionProgress } from '@/modules/actions/interfaces/actionReport';
import { Button } from '@/shared/components/Button';
import { ProgressBar } from '@/shared/components/ProgressBar';

interface WorkingStatusProps {
  progress   : ActionProgress | null;
  fileCount  : number;
  cancelling : boolean;
  onCancel   : () => void;
}

// One file: indeterminate bar. Several: the bar advances as files finish, with "N de M" and how many run at once
// (or the current name when they go one by one).
export const WorkingStatus = ({ progress, fileCount, cancelling, onCancel }: WorkingStatusProps) => {
  const several = fileCount > 1;
  const done    = progress?.current ?? 0;
  // const finished = progress ? progress.current - 1 : 0;

  return (
    <div className="flex min-h-[88px] flex-col justify-center gap-2 rounded-control border border-dashed border-line-dashed px-3 py-2.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-lilac-soft">{cancelling ? ACTIONS_TEXTS.cancelling : ACTIONS_TEXTS.working}</span>
        <Button variant="secondary" onClick={onCancel} disabled={cancelling} className="h-8 px-3 text-xs">
          {ACTIONS_TEXTS.cancel}
        </Button>
      </div>
      <ProgressBar value={several ? done / fileCount : null} />
      {several && progress && (
        <div className="flex items-center justify-between gap-3 text-[11px] text-muted">
          <span className="min-w-0 truncate">{progress.active > 1 ? ACTIONS_TEXTS.parallel(progress.active) : progress.name}</span>
          <span className="shrink-0">{ACTIONS_TEXTS.progressCount(progress.current, progress.total)}</span>
        </div>
      )}
    </div>
  );
};
