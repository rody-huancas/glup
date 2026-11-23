import { useId, useRef } from 'react';
import { Button } from '@/shared/components/Button';
import { useFocusTrap } from '@/shared/hooks/useFocusTrap';

interface ConfirmDialogProps {
  title     : string;
  body      : string;
  confirm   : string;
  cancel    : string;
  onConfirm : () => void;
  onCancel  : () => void;
}

// Inside the panel (no browser dialogs). The safe option comes first and takes the focus; Tab stays
// inside, Esc or a click outside cancel. Whoever opens it keeps the island open (useIslandHold).
export const ConfirmDialog = ({ title, body, confirm, cancel, onConfirm, onCancel }: ConfirmDialogProps) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId   = useId();
  const bodyId    = useId();
  const onKeyDown = useFocusTrap({ containerRef: dialogRef, onEscape: onCancel });

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center rounded-[18px] bg-black/55" onPointerDown={onCancel}>
      <div
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={bodyId}
        className="w-[340px] rounded-[18px] border border-line-strong bg-surface p-5 shadow-2xl"
        onPointerDown={(event) => event.stopPropagation()}
        onKeyDown={onKeyDown}
      >
        <h2 id={titleId} className="text-[15px] font-semibold text-text">{title}</h2>
        <p id={bodyId} className="mt-1.5 text-[13px] text-muted">{body}</p>
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
};
