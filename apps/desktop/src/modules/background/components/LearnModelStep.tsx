import { formatFileSize } from '@/modules/actions/utils/fileSize';
import { LEARN_MASCOT_WIDTH } from '@/modules/background/constants/background';
import { BACKGROUND_TEXTS } from '@/modules/background/constants/texts';
import { useAttentiveMascot } from '@/modules/background/hooks/useAttentiveMascot';
import { useModelDownload } from '@/modules/background/hooks/useModelDownload';
import { downloadFraction } from '@/modules/background/utils/learnStep';
import { Mascot } from '@/modules/mascot/components/Mascot';
import { StepHeader } from '@/modules/pdf/components/StepHeader';
import { Button } from '@/shared/components/Button';
import { ProgressBar } from '@/shared/components/ProgressBar';
import { Skeleton } from '@/shared/components/Skeleton';

interface LearnModelStepProps {
  downloading : boolean;
  onStarted   : () => void;
  onStopped   : () => void;
  onReady     : () => void;
  onBack      : () => void;
}

// The first "Quitar fondo": Glup asks before downloading, with the size, and shows the download.
export const LearnModelStep = ({ downloading, onStarted, onStopped, onReady, onBack }: LearnModelStepProps) => {
  const model         = useModelDownload({ downloading, onStarted, onStopped, onReady });
  const controllerRef = useAttentiveMascot(downloading);
  const progress      = model.task?.progress ?? null;
  const fraction      = progress ? downloadFraction(progress.current, progress.total) : null;
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
            <p className="text-[13px] text-text">{BACKGROUND_TEXTS.learnBody(formatFileSize(model.status.size))}</p>
          ) : (
            <Skeleton className="h-9 w-full" />
          )}
          {downloading ? (
            <div className="flex flex-col gap-2">
              <ProgressBar value={fraction} />
              <div className="flex items-center justify-between gap-3 text-[11px] text-muted">
                <span className="min-w-0 truncate">{progress?.detail ?? BACKGROUND_TEXTS.learning}</span>
                <Button variant="secondary" onClick={model.cancel} disabled={cancelling} className="h-8 px-3 text-xs">
                  {cancelling ? BACKGROUND_TEXTS.cancelling : BACKGROUND_TEXTS.cancel}
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {model.error && <p className="text-[11px] text-[#E58A9A]">{model.error}</p>}
              <div className="flex gap-2">
                <Button onClick={model.start} disabled={!model.status} className="h-9">
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
