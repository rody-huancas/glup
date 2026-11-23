import { useId } from 'react';
import { getSelectionIcon } from '@/modules/actions/utils/fileIcon';
import { HistoryTextDetail } from '@/modules/history/components/HistoryTextDetail';
import { HISTORY_TEXTS } from '@/modules/history/constants/history';
import type { HistoryEntry } from '@/modules/history/interfaces/historyEntry';
import type { HistoryItemSelection } from '@/modules/history/interfaces/historyItemSelection';
import { getHistoryDetail, historyEntryElementId } from '@/modules/history/utils/historyEntry';
import { textPreview } from '@/modules/history/utils/textPreview';
import { Checkbox } from '@/shared/components/Checkbox';
import { REVEAL_PROPS } from '@/shared/constants/reveal';
import { CleanupIcon } from '@/shared/icons/CleanupIcon';
import { FileIcon } from '@/shared/icons/FileIcon';
import { ScreenTextIcon } from '@/shared/icons/ScreenTextIcon';

interface HistoryItemProps {
  entry      : HistoryEntry;
  now        : Date;
  missing    : boolean;
  expanded   : boolean;
  // Only in Historial: the check of the line.
  selection? : HistoryItemSelection;
  onOpen     : (entry: HistoryEntry) => void;
  onExpand   : (id: string) => void;
}

// A file opens on click; a text copied from the screen opens on its line, whole and ready to copy again.
export const HistoryItem = ({ entry, now, missing, expanded, selection, onOpen, onExpand }: HistoryItemProps) => {
  const detailId = useId();
  const cleanup  = entry.type === 'cleanup';
  const text     = entry.type === 'screen-text' ? entry.text : undefined;
  const icon     = entry.type === 'cleanup' || entry.type === 'screen-text' ? null : getSelectionIcon(entry.type);
  const title    = text ? textPreview(text) : entry.name;
  const detail   = missing ? HISTORY_TEXTS.missing : text ? HISTORY_TEXTS.textDetail(getHistoryDetail(entry, now)) : getHistoryDetail(entry, now);

  return (
    <li {...REVEAL_PROPS.card} id={historyEntryElementId(entry.id)} className="rounded-[14px] bg-raised">
      <div className="flex items-center gap-1 pl-3">
        {selection && <Checkbox label={HISTORY_TEXTS.selectEntry(title)} checked={selection.checked} onChange={() => selection.onToggle(entry.id)} />}
        <button
          type="button"
          onClick={() => (text ? onExpand(entry.id) : onOpen(entry))}
          disabled={cleanup}
          aria-expanded={text ? expanded : undefined}
          aria-controls={text && expanded ? detailId : undefined}
          className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 rounded-[14px] py-2.5 pl-2 pr-3 text-left transition-colors hover:bg-line disabled:cursor-default disabled:hover:bg-transparent"
        >
          {icon && <img src={icon} alt="" draggable={false} className="size-7 shrink-0 object-contain" />}
          {!icon && cleanup && <CleanupIcon className="size-7 text-mint" />}
          {!icon && text !== undefined && <ScreenTextIcon className="size-7 text-lilac" />}
          {!icon && !cleanup && text === undefined && <FileIcon className="size-7 text-muted" />}
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-semibold text-text">{title}</p>
            <p className={missing ? 'truncate text-xs text-lilac-soft' : 'truncate text-xs text-muted'}>{detail}</p>
          </div>
        </button>
      </div>
      {text && expanded && <HistoryTextDetail id={detailId} text={text} />}
    </li>
  );
};
