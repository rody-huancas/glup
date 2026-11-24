import { FOLDER_SORT_TEXTS } from '@/modules/folder-sort/constants/texts';
import { Button } from '@/shared/components/Button';
import { FolderIcon } from '@/shared/icons/FolderIcon';

interface SortFolderPickerProps {
  folder   : string | null;
  disabled : boolean;
  onPick   : () => void;
}

// The folder to sort (Descargas by default) and the way to choose another one.
export const SortFolderPicker = ({ folder, disabled, onPick }: SortFolderPickerProps) => (
  <div className="flex items-center gap-3 rounded-[14px] bg-raised py-2.5 pl-3 pr-2.5">
    <FolderIcon className="size-6 text-lilac" />
    <div className="min-w-0 flex-1">
      <p className="text-[11px] font-semibold text-muted">{FOLDER_SORT_TEXTS.folder}</p>
      <p className="truncate text-[13px] font-semibold text-text" title={folder ?? undefined}>{folder ?? FOLDER_SORT_TEXTS.noFolder}</p>
    </div>
    <Button variant="secondary" onClick={onPick} disabled={disabled} className="h-8 shrink-0 px-3 text-xs">
      {FOLDER_SORT_TEXTS.pick}
    </Button>
  </div>
);
