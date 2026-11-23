import { CONFUSED_FACE, ID_PHOTO_TEXTS, PREVIEW_FRAME_HEIGHT } from '@/modules/id-photo/constants/idPhoto';
import { useIdPreview } from '@/modules/id-photo/hooks/useIdPreview';
import type { IdChoice } from '@/modules/id-photo/interfaces/idChoice';
import type { IdCrop } from '@/modules/id-photo/interfaces/idCrop';
import { photoOnScreen } from '@/modules/id-photo/utils/cropMath';
import { Mascot } from '@/modules/mascot/components/Mascot';
import { StepHeader } from '@/modules/pdf/components/StepHeader';
import { Button } from '@/shared/components/Button';
import { IconButton } from '@/shared/components/IconButton';
import { Skeleton } from '@/shared/components/Skeleton';
import { MinusIcon } from '@/shared/icons/MinusIcon';
import { PlusIcon } from '@/shared/icons/PlusIcon';

interface IdPreviewStepProps {
  path   : string;
  choice : IdChoice;
  onDone : (session: number, crop: IdCrop) => void;
  onBack : () => void;
}

// The photo over white inside the frame of the chosen size; drag to move it and zoom with the wheel
// or the buttons, then "Listo".
export const IdPreviewStep = ({ path, choice, onDone, onBack }: IdPreviewStepProps) => {
  const preview = useIdPreview({ path, format: choice.format });
  const frame   = { height: PREVIEW_FRAME_HEIGHT, width: (PREVIEW_FRAME_HEIGHT * choice.format.widthCm) / choice.format.heightCm };
  const report  = preview.report;
  const screen  = report && preview.crop ? photoOnScreen(preview.crop, frame.height, report) : null;

  return (
    <div className="flex flex-col">
      <StepHeader title={ID_PHOTO_TEXTS.previewTitle} onBack={onBack} />
      {preview.error ? (
        <div className="mt-3 flex items-center gap-3">
          <div className="w-16 shrink-0">
            <Mascot face={CONFUSED_FACE} reactToDrops={false} limbs={false} />
          </div>
          <p className="text-[14px] font-semibold text-lilac-soft">{preview.error}</p>
        </div>
      ) : (
        <div className="mt-2.5 flex gap-4">
          <div
            role="img"
            aria-label={ID_PHOTO_TEXTS.frame}
            className="relative shrink-0 cursor-grab touch-none overflow-hidden border border-line-strong bg-white active:cursor-grabbing"
            style={{ width: frame.width, height: frame.height }}
            {...(screen ? preview.handlers : {})}
          >
            {preview.url && screen ? (
              <img
                src={preview.url}
                alt=""
                draggable={false}
                className="pointer-events-none absolute max-w-none select-none"
                style={{ left: screen.left, top: screen.top, width: screen.width, height: screen.height }}
              />
            ) : (
              <Skeleton className="h-full w-full" />
            )}
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-2.5">
            <p className="text-[12px] text-muted">{report ? ID_PHOTO_TEXTS.adjustHint : ID_PHOTO_TEXTS.preparing}</p>
            {report?.warning && <p className="text-[12px] text-warn">{report.warning}</p>}
            <div className="flex items-center gap-1">
              <IconButton icon={MinusIcon} label={ID_PHOTO_TEXTS.zoomOut} onClick={preview.zoomOut} disabled={!report} className="size-9 border border-line-strong" iconClass="size-4" />
              <IconButton icon={PlusIcon} label={ID_PHOTO_TEXTS.zoomIn} onClick={preview.zoomIn} disabled={!report} className="size-9 border border-line-strong" iconClass="size-4" />
              <Button variant="secondary" onClick={() => void preview.reset()} disabled={!report} className="ml-1 h-9 px-3 text-xs">
                {ID_PHOTO_TEXTS.reset}
              </Button>
            </div>
            <Button
              onClick={() => report && preview.crop && onDone(report.session, preview.crop)}
              disabled={!report}
              className="mt-auto h-10 w-fit disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:brightness-100"
            >
              {ID_PHOTO_TEXTS.done}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
