import { Button } from '@/shared/components/Button';

interface ConfirmDialogProps {
  title     : string;
  body      : string;
  confirm   : string;
  cancel    : string;
  onConfirm : () => void;
  onCancel  : () => void;
}

// Inside the panel (no browser dialogs); the safe option comes first.
export const ConfirmDialog = ({ title, body, confirm, cancel, onConfirm, onCancel }: ConfirmDialogProps) => (
  <div className="absolute inset-0 z-40 flex items-center justify-center rounded-[18px] bg-black/55" onPointerDown={onCancel}>
    <div
      role="alertdialog"
      aria-modal="true"
      aria-label={title}
      className="w-[340px] rounded-[18px] border border-line-strong bg-surface p-5 shadow-2xl"
      onPointerDown={(event) => event.stopPropagation()}
    >
      <h2 className="text-[15px] font-semibold text-text">{title}</h2>
      <p className="mt-1.5 text-[13px] text-muted">{body}</p>
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="secondary" onClick={onCancel} className="h-9">
          {cancel}
        </Button>
        <Button onClick={onConfirm} className="h-9">
          {confirm}
        </Button>
      </div>
    </div>
  </div>
);
