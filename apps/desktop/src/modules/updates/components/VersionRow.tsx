import { UPDATE_TEXTS } from '@/modules/updates/constants/texts';
import { useUpdate } from '@/modules/updates/hooks/useUpdate';
import type { UpdatePhase } from '@/modules/updates/types/updatePhase';
import { Button } from '@/shared/components/Button';
import { Skeleton } from '@/shared/components/Skeleton';

const STATUS_TEXTS: Partial<Record<UpdatePhase, string>> = {
  'up-to-date'   : UPDATE_TEXTS.upToDate,
  'check-failed' : UPDATE_TEXTS.checkFailed,
};

// Ajustes › General: the installed version and a manual check.
export const VersionRow = () => {
  const update   = useUpdate();
  const checking = update.phase === 'checking';
  const status   = STATUS_TEXTS[update.phase];

  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex min-w-0 flex-col">
        {update.version ? (
          <span className="text-[13px] font-semibold text-text">{UPDATE_TEXTS.version(update.version)}</span>
        ) : (
          <Skeleton className="h-4 w-24" />
        )}
        {status && <span className="text-[11px] text-muted">{status}</span>}
      </div>
      <Button variant="secondary" onClick={update.check} disabled={checking || update.phase === 'installing'} className="h-9 shrink-0">
        {checking ? UPDATE_TEXTS.checking : UPDATE_TEXTS.check}
      </Button>
    </div>
  );
};
