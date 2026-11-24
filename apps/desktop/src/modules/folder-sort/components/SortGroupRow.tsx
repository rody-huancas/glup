import { useId } from 'react';
import { formatFileSize } from '@/modules/actions/utils/fileSize';
import { FOLDER_SORT_TEXTS } from '@/modules/folder-sort/constants/texts';
import type { PreviewGroup } from '@/modules/folder-sort/interfaces/previewGroup';
import { visibleFiles } from '@/modules/folder-sort/utils/sortView';
import { ChevronDownIcon } from '@/shared/icons/ChevronDownIcon';
import { FolderIcon } from '@/shared/icons/FolderIcon';
import { cx } from '@/shared/utils/classNames';

interface SortGroupRowProps {
  group    : PreviewGroup;
  expanded : boolean;
  onToggle : (folder: string) => void;
}

// "Imágenes: 34 archivos, 120 MB", and open, each file that goes there.
export const SortGroupRow = ({ group, expanded, onToggle }: SortGroupRowProps) => {
  const listId           = useId();
  const { shown, hidden } = visibleFiles(group.files);

  return (
    <li className="rounded-[14px] bg-raised">
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={expanded ? listId : undefined}
        aria-label={FOLDER_SORT_TEXTS.showFiles(group.folder)}
        onClick={() => onToggle(group.folder)}
        className="flex w-full cursor-pointer items-center gap-3 rounded-[14px] px-3 py-2.5 text-left transition-colors hover:bg-line"
      >
        <FolderIcon className="size-5 text-mint" />
        <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-text">{group.folder}</span>
        <span className="shrink-0 text-xs text-muted">{FOLDER_SORT_TEXTS.files(group.count)} · {formatFileSize(group.bytes)}</span>
        <ChevronDownIcon className={cx('size-4 text-muted transition-transform motion-reduce:transition-none', expanded && 'rotate-180')} />
      </button>
      {expanded && (
        <ul id={listId} className="flex flex-col gap-0.5 px-3 pb-2.5 pl-11">
          {shown.map((file) => (
            <li key={file.name} className="flex gap-3 text-xs">
              <span className="min-w-0 flex-1 truncate text-text">{file.name}</span>
              <span className="shrink-0 text-muted">{formatFileSize(file.size)}</span>
            </li>
          ))}
          {hidden > 0 && <li className="text-xs text-muted">{FOLDER_SORT_TEXTS.more(hidden)}</li>}
        </ul>
      )}
    </li>
  );
};
