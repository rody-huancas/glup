import { WorkingStatus } from '@/modules/actions/components/WorkingStatus';
import { formatFileSize } from '@/modules/actions/utils/fileSize';
import { LEARN_MASCOT_WIDTH } from '@/modules/background/constants/background';
import { BACKGROUND_TEXTS } from '@/modules/background/constants/texts';
import { useAttentiveMascot } from '@/modules/background/hooks/useAttentiveMascot';
import { useModelDownload } from '@/modules/background/hooks/useModelDownload';
import type { Learnable } from '@/modules/background/interfaces/learnable';
import { Mascot } from '@/modules/mascot/components/Mascot';
import { StepHeader } from '@/modules/pdf/components/StepHeader';
import { Button } from '@/shared/components/Button';
import { Skeleton } from '@/shared/components/Skeleton';

interface LearnModelStepProps {
  // What Glup has to learn: the background model or the video program.
  learnable   : Learnable;
  downloading : boolean;
  onStarted   : () => void;
  onStopped   : () => void;
  onReady     : () => void;
  onBack      : () => void;
  // The action waits for this download: "Descargar" starts one task for both (the download, then the
  // action), instead of a download of its own here.
  onAccept?   : () => void;
}

// The first "Quitar fondo" or video: Glup asks before downloading, with the size, and shows the download.
export const LearnModelStep = ({ learnable, downloading, onStarted, onStopped, onReady, onBack, onAccept }: LearnModelStepProps) => {
  const model         = useModelDownload({ learnable, downloading, onStarted, onStopped, onReady });
  const controllerRef = useAttentiveMascot(downloading);
  const progress      = model.task?.progress ?? null;
  const cancelling    = model.task?.cancelling ?? false;

  return (
    <div className="flex flex-col">
      <StepHeader title={BACKGROUND_TEXTS.learnTitle} onBack={onBack} />
      <div className="mt-2.5 flex items-start gap-3">
        <div className="shrink-0" style={{ width: LEARN_MASCOT_WIDTH }}>
          <Mascot controllerRef={controllerRef} reactToDrops={false} />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-2.5">
          {model.status ? (
            <p className="text-[13px] text-text">{learnable.texts.body(formatFileSize(model.status.size))}</p>
          ) : (
            <Skeleton className="h-9 w-full" />
          )}
          {downloading ? (
            // The same status as any task: "Descargando lo que necesito… 12 MB de 109 MB", then "Comprobando…".
            <WorkingStatus progress={progress} fileCount={1} actionId={null} cancelling={cancelling} onCancel={model.cancel} />
          ) : (
            <div className="flex flex-col gap-2">
              {model.error && <p className="text-[11px] text-[#E58A9A]">{model.error}</p>}
              <div className="flex gap-2">
                <Button onClick={onAccept ?? model.start} disabled={!model.status} className="h-9">
                  {model.error ? BACKGROUND_TEXTS.retry : BACKGROUND_TEXTS.download}
                </Button>
                <Button variant="secondary" onClick={onBack} className="h-9">
                  {BACKGROUND_TEXTS.notNow}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
