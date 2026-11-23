import { getSelectionIcon } from '@/modules/actions/utils/fileIcon';
import { HISTORY_TEXTS } from '@/modules/history/constants/history';
import type { HistoryEntry } from '@/modules/history/interfaces/historyEntry';
import { getHistoryDetail } from '@/modules/history/utils/historyEntry';
import { REVEAL_PROPS } from '@/shared/constants/reveal';
import { CleanupIcon } from '@/shared/icons/CleanupIcon';
import { FileIcon } from '@/shared/icons/FileIcon';

interface HistoryItemProps {
  entry   : HistoryEntry;
  now     : Date;
  missing : boolean;
  onOpen  : (entry: HistoryEntry) => void;
}

export const HistoryItem = ({ entry, now, missing, onOpen }: HistoryItemProps) => {
  const cleanup = entry.type === 'cleanup';
  const icon    = entry.type === 'cleanup' ? null : getSelectionIcon(entry.type);

  return (
    <li {...REVEAL_PROPS.card}>
      <button
        type="button"
        onClick={() => onOpen(entry)}
        disabled={cleanup}
        className="flex w-full cursor-pointer items-center gap-3 rounded-[14px] bg-raised px-3 py-2.5 text-left transition-colors hover:bg-line disabled:cursor-default disabled:hover:bg-raised"
      >
        {icon && <img src={icon} alt="" draggable={false} className="size-7 shrink-0 object-contain" />}
        {!icon && (cleanup ? <CleanupIcon className="size-7 text-mint" /> : <FileIcon className="size-7 text-muted" />)}
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-semibold text-text">{entry.name}</p>
          <p className={missing ? 'truncate text-xs text-lilac-soft' : 'truncate text-xs text-muted'}>
            {missing ? HISTORY_TEXTS.missing : getHistoryDetail(entry, now)}
          </p>
        </div>
      </button>
    </li>
  );
};
