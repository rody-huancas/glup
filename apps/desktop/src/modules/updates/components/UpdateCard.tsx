import { UpdateNotes } from '@/modules/updates/components/UpdateNotes';
import { UPDATE_TEXTS } from '@/modules/updates/constants/texts';
import { useUpdate } from '@/modules/updates/hooks/useUpdate';
import { isDownloaded, progressDetail, progressValue } from '@/modules/updates/utils/progress';
import { Button } from '@/shared/components/Button';
import { Card } from '@/shared/components/Card';
import { ProgressBar } from '@/shared/components/ProgressBar';

// Only when there is a newer version: what it brings and the button to install it.
export const UpdateCard = () => {
  const update = useUpdate();

  if (!update.available) return null;

  const installing = update.phase === 'installing';
  const detail     = progressDetail(update.progress);

  return (
    <Card className="flex flex-col gap-3 border-lilac/40 p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-2">
          <span className="text-[15px] font-semibold text-text">{UPDATE_TEXTS.available(update.available.version)}</span>
          <span className="text-[11px] font-semibold text-lilac">{UPDATE_TEXTS.notesTitle}</span>
          <UpdateNotes notes={update.available.notes} />
        </div>
        {!installing && (
          <Button onClick={update.install} className="h-9 shrink-0">
            {UPDATE_TEXTS.installNow}
          </Button>
        )}
      </div>
      {installing && (
        <div className="flex flex-col gap-1.5">
          <ProgressBar value={progressValue(update.progress)} />
          <span className="flex justify-between gap-3 text-[11px] text-muted">
            <span>{isDownloaded(update.progress) ? UPDATE_TEXTS.installing : UPDATE_TEXTS.downloading}</span>
            {detail && <span>{detail}</span>}
          </span>
        </div>
      )}
      {update.phase === 'install-failed' && <span className="text-[11px] text-[#E58A9A]">{update.error ?? UPDATE_TEXTS.installError}</span>}
    </Card>
  );
};
