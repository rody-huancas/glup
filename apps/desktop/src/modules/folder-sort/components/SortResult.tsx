import { FOLDER_SORT_TEXTS } from '@/modules/folder-sort/constants/texts';
import type { SortReport } from '@/modules/folder-sort/interfaces/sortReport';
import type { UndoReport } from '@/modules/folder-sort/interfaces/undoReport';
import { Mascot } from '@/modules/mascot/components/Mascot';
import { TOAST_FACES } from '@/modules/notices/constants/notices';
import { Button } from '@/shared/components/Button';
import { cx } from '@/shared/utils/classNames';

interface SortResultProps {
  report  : SortReport;
  // The last undo of this sort, once it ended.
  undone  : UndoReport | null;
  canUndo : boolean;
  onUndo  : () => void;
}

// How it went (or how the undo went), with "Deshacer" while it can still be undone.
export const SortResult = ({ report, undone, canUndo, onUndo }: SortResultProps) => {
  const summary = undone?.summary ?? report.summary;
  const failed  = summary.tone === 'failed' || summary.tone === 'partial';

  return (
    <div className="flex items-center gap-4 rounded-[14px] bg-raised p-4">
      <div className="w-14 shrink-0">
        <Mascot face={failed ? TOAST_FACES.confused : TOAST_FACES.happy} reactToDrops={false} limbs={false} />
      </div>
      <div className="min-w-0 flex-1">
        <p className={cx('text-[15px] font-semibold', failed ? 'text-lilac-soft' : 'text-mint')}>{summary.message}</p>
        {summary.note && <p className="mt-0.5 text-[13px] text-muted">{summary.note}</p>}
      </div>
      {canUndo && (
        <Button variant="secondary" onClick={onUndo} className="h-10 shrink-0">
          {FOLDER_SORT_TEXTS.undo}
        </Button>
      )}
    </div>
  );
};
