import { revealFile } from '@/modules/actions/services/files';
import { formatFileSize } from '@/modules/actions/utils/fileSize';
import { DuplicateThumb } from '@/modules/duplicates/components/DuplicateThumb';
import { DUPLICATES_TEXTS } from '@/modules/duplicates/constants/texts';
import type { DuplicateGroup } from '@/modules/duplicates/interfaces/duplicateGroup';
import { keepFile, toggleFile } from '@/modules/duplicates/store/duplicatesStore';
import { fileName, folderOf } from '@/modules/duplicates/utils/filters';
import { keptPath } from '@/modules/duplicates/utils/selection';
import { formatRelativeDate } from '@/modules/history/utils/relativeDate';
import { Checkbox } from '@/shared/components/Checkbox';
import { FolderIcon } from '@/shared/icons/FolderIcon';
import { cx } from '@/shared/utils/classNames';

interface DuplicateGroupCardProps {
  group    : DuplicateGroup;
  marked   : Set<string>;
  disabled : boolean;
  now      : Date;
}

// A group: its picture, how many copies and what they free, and each copy with its folder, date and
// name; a tick quits it (never the last one), «Queda» says which stays and can be moved.
export const DuplicateGroupCard = ({ group, marked, disabled, now }: DuplicateGroupCardProps) => {
  const kept = keptPath(group, marked);

  return (
    <li className={cx('flex gap-3 rounded-[14px] border bg-raised p-3', group.kind === 'similar' ? 'border-lilac/30' : 'border-line')}>
      <DuplicateThumb path={group.files[0].path} />
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <p className="flex items-baseline justify-between gap-2 text-[12px]">
          <span className="flex min-w-0 items-baseline gap-2">
            <span className="truncate font-semibold text-text">{fileName(group.files[0].path)}</span>
            {group.kind === 'same' && group.review && (
              <span title={DUPLICATES_TEXTS.reviewHint} className="shrink-0 rounded-full bg-warn/15 px-2 py-0.5 text-[10px] font-bold text-warn">{DUPLICATES_TEXTS.review}</span>
            )}
          </span>
          <span className="shrink-0 text-muted">{DUPLICATES_TEXTS.copies(group.files.length)} · {DUPLICATES_TEXTS.frees(formatFileSize(group.freeable))}</span>
        </p>
        <ul className="flex flex-col gap-1">
          {group.files.map((file) => {
            const name    = fileName(file.path);
            const quitted = marked.has(file.path);
            const last    = !quitted && group.files.filter((item) => !marked.has(item.path)).length <= 1;

            return (
              <li key={file.path} className="flex min-h-8 items-center gap-2 rounded-md px-1 hover:bg-line/40">
                <span title={last ? DUPLICATES_TEXTS.lastOne : undefined} className="flex">
                  <Checkbox
                    checked={quitted}
                    disabled={disabled || last}
                    label={last ? `${DUPLICATES_TEXTS.quit(name)} · ${DUPLICATES_TEXTS.lastOne}` : DUPLICATES_TEXTS.quit(name)}
                    onChange={() => toggleFile(group, file.path)}
                  />
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className={cx('truncate text-[12px]', quitted ? 'text-muted line-through' : 'text-text')} title={file.path}>{name}</span>
                  <span className="truncate text-[11px] text-muted" title={folderOf(file.path)}>{folderOf(file.path)} · {formatRelativeDate(new Date(file.modified).toISOString(), now)}</span>
                </span>
                {kept === file.path ? (
                  <span className="shrink-0 rounded-full bg-mint/15 px-2 py-0.5 text-[10px] font-bold text-mint">{DUPLICATES_TEXTS.keep}</span>
                ) : (
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => keepFile(group, file.path)}
                    aria-label={DUPLICATES_TEXTS.keepThis(name)}
                    className="shrink-0 cursor-pointer rounded-md px-1.5 text-[11px] font-semibold text-lilac outline-none hover:text-lilac-soft focus-visible:outline-2 focus-visible:outline-lilac disabled:cursor-default disabled:opacity-40"
                  >
                    {DUPLICATES_TEXTS.keep}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => void revealFile(file.path)}
                  aria-label={DUPLICATES_TEXTS.openFolderOf(name)}
                  title={DUPLICATES_TEXTS.openFolder}
                  className="flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted outline-none hover:bg-line hover:text-text focus-visible:outline-2 focus-visible:outline-lilac"
                >
                  <FolderIcon className="size-4" />
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </li>
  );
};
