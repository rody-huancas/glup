import { CLOSE_TEXTS } from '@/modules/performance/constants/texts';
import type { CloseRequest } from '@/modules/performance/interfaces/closeRequest';
import { ConfirmDialog } from '@/shared/components/ConfirmDialog';

interface CloseAppDialogProps {
  request   : CloseRequest;
  noWindow  : boolean;
  onConfirm : () => void;
  onForce   : () => void;
  onCancel  : () => void;
}

// First the question; while it closes, what is happening; if it did not close, the choice to force it.
export const CloseAppDialog = ({ request, noWindow, onConfirm, onForce, onCancel }: CloseAppDialogProps) => {
  const name = request.app.name;

  if (request.step === 'closing' || request.step === 'forcing') {
    return (
      <div className="absolute inset-0 z-40 flex items-center justify-center rounded-[18px] bg-black/55">
        <p role="status" className="rounded-[18px] border border-line-strong bg-surface px-5 py-4 text-[13px] text-text shadow-2xl">
          {request.step === 'closing' ? CLOSE_TEXTS.closing(name) : CLOSE_TEXTS.forcing}
        </p>
      </div>
    );
  }

  if (request.step === 'stuck') {
    const body = request.error ?? (noWindow ? CLOSE_TEXTS.noWindow : CLOSE_TEXTS.stuck);
    return <ConfirmDialog title={CLOSE_TEXTS.stuckTitle(name)} body={body} confirm={CLOSE_TEXTS.force} cancel={CLOSE_TEXTS.keep} onConfirm={onForce} onCancel={onCancel} />;
  }

  return <ConfirmDialog title={CLOSE_TEXTS.title(name)} body={CLOSE_TEXTS.body} confirm={CLOSE_TEXTS.confirm} cancel={CLOSE_TEXTS.keep} onConfirm={onConfirm} onCancel={onCancel} />;
};
