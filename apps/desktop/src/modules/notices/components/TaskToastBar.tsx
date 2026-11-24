import { useSortUndo } from '@/modules/folder-sort/hooks/useSortUndo';
import { Mascot } from '@/modules/mascot/components/Mascot';
import type { PageId } from '@/modules/main-window/types/pageId';
import { NOTICE_TEXTS, TOAST_FACES } from '@/modules/notices/constants/notices';
import { useTaskToast } from '@/modules/notices/hooks/useTaskToast';
import { dismissToast } from '@/modules/notices/store/toastStore';
import { Button } from '@/shared/components/Button';
import { IconButton } from '@/shared/components/IconButton';
import { CloseIcon } from '@/shared/icons/CloseIcon';
import { cx } from '@/shared/utils/classNames';

interface TaskToastBarProps {
  onNavigate : (page: PageId) => void;
}

// Above the page (it pushes it down, never covers its buttons): mini Glup, the result, "Ver" and, after
// sorting a folder, "Deshacer".
export const TaskToastBar = ({ onNavigate }: TaskToastBarProps) => {
  const toast    = useTaskToast();
  const sortUndo = useSortUndo();
  if (!toast) return null;

  const undoId = toast.undoId;

  const failed = toast.tone === 'failed' || toast.tone === 'partial';

  return (
    <div
      role="status"
      aria-live="polite"
      className="mb-4 flex shrink-0 items-center gap-3 rounded-[14px] border border-line-strong bg-raised py-2 pl-2 pr-2.5 shadow-lg animate-toast-in"
    >
      <div className="w-9 shrink-0">
        <Mascot face={failed ? TOAST_FACES.confused : TOAST_FACES.happy} reactToDrops={false} limbs={false} />
      </div>
      <p className={cx('min-w-0 flex-1 truncate text-[13px] font-semibold', failed ? 'text-lilac-soft' : 'text-mint')}>{toast.message}</p>
      {undoId && (
        <Button
          variant="secondary"
          disabled={sortUndo.running}
          onClick={() => {
            sortUndo.undo(undoId);
            dismissToast();
          }}
          className="h-8 shrink-0 px-3 text-xs"
        >
          {NOTICE_TEXTS.undo}
        </Button>
      )}
      <Button
        variant="secondary"
        onClick={() => {
          onNavigate(toast.owner);
          dismissToast();
        }}
        className="h-8 shrink-0 px-3 text-xs"
      >
        {NOTICE_TEXTS.see}
      </Button>
      <IconButton icon={CloseIcon} label={NOTICE_TEXTS.close} onClick={dismissToast} className="size-8" iconClass="size-3.5" />
    </div>
  );
};
