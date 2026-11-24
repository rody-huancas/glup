import { formatFileSize } from '@/modules/actions/utils/fileSize';
import { FOLDER_SORT_TEXTS } from '@/modules/folder-sort/constants/texts';
import type { SortPreview } from '@/modules/folder-sort/interfaces/sortPreview';
import type { FolderSortPhase } from '@/modules/folder-sort/types/folderSortPhase';
import { Button } from '@/shared/components/Button';
import { ProgressBar } from '@/shared/components/ProgressBar';

interface SortFooterProps {
  phase      : FolderSortPhase;
  preview    : SortPreview | null;
  canReview  : boolean;
  undoing    : boolean;
  progress   : number | null;
  name       : string;
  waiting    : boolean;
  cancelling : boolean;
  onReview   : () => void;
  onSort     : () => void;
  onCancel   : () => void;
  onAgain    : () => void;
}

const disabledLook = 'disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:brightness-100';

// Always at the bottom: while moving (or undoing), the progress and Cancelar; with a preview, what would
// move and "Ordenar"; after, "Ordenar otra vez"; at first, "Revisar la carpeta".
export const SortFooter = ({ phase, preview, canReview, undoing, progress, name, waiting, cancelling, onReview, onSort, onCancel, onAgain }: SortFooterProps) => {
  if (phase === 'sorting' || undoing) {
    const label = waiting ? FOLDER_SORT_TEXTS.waiting : undoing ? FOLDER_SORT_TEXTS.undoing(name) : FOLDER_SORT_TEXTS.sorting(name);

    return (
      <footer className="flex shrink-0 items-center gap-3 border-t border-line pt-3">
        <div className="min-w-0 flex-1">
          <p aria-live="polite" className="truncate text-[13px] font-semibold leading-snug text-text">{label}</p>
          <div className="mt-1.5">
            <ProgressBar value={progress} />
          </div>
        </div>
        <Button variant="secondary" onClick={onCancel} disabled={cancelling} className="h-10 shrink-0">
          {cancelling ? FOLDER_SORT_TEXTS.cancelling : FOLDER_SORT_TEXTS.cancel}
        </Button>
      </footer>
    );
  }

  if (phase === 'ready' && preview) {
    return (
      <footer className="flex shrink-0 items-center gap-3 border-t border-line pt-3">
        <p className="min-w-0 flex-1 text-[13px] text-muted">
          {preview.count > 0 ? FOLDER_SORT_TEXTS.plan(preview.count, formatFileSize(preview.bytes), preview.groups.length) : FOLDER_SORT_TEXTS.nothing}
        </p>
        <Button variant="secondary" onClick={onReview} className="h-10 shrink-0">
          {FOLDER_SORT_TEXTS.reviewAgain}
        </Button>
        <Button onClick={onSort} disabled={preview.count === 0} className={`h-10 shrink-0 ${disabledLook}`}>
          {FOLDER_SORT_TEXTS.sort}
        </Button>
      </footer>
    );
  }

  return (
    <footer className="flex shrink-0 justify-end border-t border-line pt-3">
      {phase === 'done' ? (
        <Button onClick={onAgain} className="h-10">
          {FOLDER_SORT_TEXTS.again}
        </Button>
      ) : (
        <Button onClick={onReview} disabled={!canReview || phase === 'previewing'} className={`h-10 ${disabledLook}`}>
          {FOLDER_SORT_TEXTS.review}
        </Button>
      )}
    </footer>
  );
};
