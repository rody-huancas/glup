import { SortFolderPicker } from '@/modules/folder-sort/components/SortFolderPicker';
import { SortFooter } from '@/modules/folder-sort/components/SortFooter';
import { SortModeChooser } from '@/modules/folder-sort/components/SortModeChooser';
import { SortPreviewList } from '@/modules/folder-sort/components/SortPreviewList';
import { SortPreviewSkeleton } from '@/modules/folder-sort/components/SortPreviewSkeleton';
import { SortResult } from '@/modules/folder-sort/components/SortResult';
import { FOLDER_SORT_TEXTS } from '@/modules/folder-sort/constants/texts';
import { useFolderSortScreen } from '@/modules/folder-sort/hooks/useFolderSortScreen';
import { PageHeader } from '@/shared/components/PageHeader';

// Three zones that always fit the panel: the folder and how to sort it on top, the preview (or the
// result) scrolling in the middle, and the fixed footer with the progress or "Ordenar".
export const FolderSortPage = () => {
  const screen = useFolderSortScreen();
  const { phase, folder, mode, preview, report, error, expanded, showSkipped, undo } = screen.sort;
  const undone = undo && report && undo.id === report.undoId ? undo.report : null;

  return (
    <div className="relative flex h-full flex-col">
      <div className="flex shrink-0 flex-col gap-3">
        <PageHeader title={FOLDER_SORT_TEXTS.title} subtitle={FOLDER_SORT_TEXTS.subtitle} />
        <SortFolderPicker folder={folder} disabled={screen.working} onPick={screen.pick} />
        <SortModeChooser mode={mode} disabled={screen.working} onChoose={screen.chooseMode} />
      </div>
      <div className="scroll-thin my-4 min-h-0 flex-1 overflow-y-auto pr-1">
        {phase === 'idle' && <p className="text-[13px] leading-relaxed text-muted">{FOLDER_SORT_TEXTS.intro}</p>}
        {phase === 'idle' && error && <p role="alert" className="mt-2 text-[13px] text-lilac-soft">{error}</p>}
        {phase === 'previewing' && <SortPreviewSkeleton />}
        {phase === 'ready' && preview && (
          <SortPreviewList preview={preview} expanded={expanded} showSkipped={showSkipped} onToggle={screen.toggleGroup} onSkipped={screen.toggleSkip} />
        )}
        {phase === 'done' && report && <SortResult report={report} undone={undone} canUndo={screen.canUndo} onUndo={screen.undo} />}
      </div>
      <SortFooter
        phase={phase}
        preview={preview}
        canReview={folder !== null}
        undoing={screen.undoing}
        progress={screen.progress}
        name={screen.name}
        waiting={screen.waiting}
        cancelling={screen.cancelling}
        onReview={screen.review}
        onSort={screen.confirm}
        onCancel={screen.cancel}
        onAgain={screen.again}
      />
    </div>
  );
};
