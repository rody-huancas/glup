import { SortGroupRow } from '@/modules/folder-sort/components/SortGroupRow';
import { SortSkippedList } from '@/modules/folder-sort/components/SortSkippedList';
import { FOLDER_SORT_TEXTS } from '@/modules/folder-sort/constants/texts';
import type { SortPreview } from '@/modules/folder-sort/interfaces/sortPreview';

interface SortPreviewListProps {
  preview     : SortPreview;
  expanded    : Set<string>;
  showSkipped : boolean;
  onToggle    : (folder: string) => void;
  onSkipped   : () => void;
}

// The preview: one line per destination folder, then what is left as it is.
export const SortPreviewList = ({ preview, expanded, showSkipped, onToggle, onSkipped }: SortPreviewListProps) => (
  <div className="flex flex-col gap-3">
    {preview.count === 0 && <p className="text-[13px] text-muted">{FOLDER_SORT_TEXTS.nothing}</p>}
    {preview.groups.length > 0 && (
      <ul className="flex flex-col gap-2">
        {preview.groups.map((group) => <SortGroupRow key={group.folder} group={group} expanded={expanded.has(group.folder)} onToggle={onToggle} />)}
      </ul>
    )}
    <SortSkippedList skipped={preview.skipped} expanded={showSkipped} onToggle={onSkipped} />
  </div>
);
