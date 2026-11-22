import { CLEANUP_TEXTS } from '@/modules/cleanup/constants/texts';
import type { CleanupItem } from '@/modules/cleanup/interfaces/cleanupItem';
import { fileNameOf, folderOf, formatItemDate } from '@/modules/cleanup/utils/itemText';
import { formatFileSize } from '@/modules/actions/utils/fileSize';
import { Checkbox } from '@/shared/components/Checkbox';

interface CategoryItemRowProps {
  item       : CleanupItem;
  top        : number;
  height     : number;
  // The recycle bin is emptied whole: its rows have no checkbox.
  selectable : boolean;
  checked    : boolean;
  // Marking it would leave no copy of the file.
  locked     : boolean;
  onToggle   : (path: string) => void;
  onReveal   : (path: string) => void;
}

export const CategoryItemRow = ({ item, top, height, selectable, checked, locked, onToggle, onReveal }: CategoryItemRowProps) => {
  const name   = fileNameOf(item.path);
  const detail = [item.group !== null ? CLEANUP_TEXTS.copy(item.group + 1) : null, folderOf(item.path)].filter(Boolean).join(' · ');

  return (
    <div className="absolute inset-x-0 flex items-center gap-3 px-3" style={{ top, height }}>
      {selectable && <Checkbox label={CLEANUP_TEXTS.markItem(name)} checked={checked} disabled={locked && !checked} onChange={() => onToggle(item.path)} />}
      <div className="min-w-0 flex-1">
        <p className="truncate text-[12px] font-semibold text-text" title={item.path}>{name}</p>
        <p className="truncate text-[11px] text-muted">{detail}</p>
      </div>
      {locked && !checked && <span className="shrink-0 text-[11px] font-semibold text-mint">{CLEANUP_TEXTS.keeps}</span>}
      <span className="w-16 shrink-0 text-right text-[12px] text-muted">{formatFileSize(item.size)}</span>
      <span className="w-20 shrink-0 text-right text-[11px] text-muted">{formatItemDate(item.modified)}</span>
      <button type="button" onClick={() => onReveal(item.path)} className="shrink-0 cursor-pointer rounded-md px-2 py-1 text-[11px] font-semibold text-lilac transition-colors hover:bg-line hover:text-lilac-soft">
        {CLEANUP_TEXTS.reveal}
      </button>
    </div>
  );
};
