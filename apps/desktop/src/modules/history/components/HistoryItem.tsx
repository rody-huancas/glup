import { getFileIcon } from '@/modules/actions/utils/fileIcon';
import type { HistoryEntry } from '@/modules/history/interfaces/historyEntry';
import { getHistoryDetail } from '@/modules/history/utils/historyEntry';
import { REVEAL_PROPS } from '@/shared/constants/reveal';

interface HistoryItemProps {
  entry : HistoryEntry;
  now   : Date;
}

export const HistoryItem = ({ entry, now }: HistoryItemProps) => (
  <li {...REVEAL_PROPS.card} className="flex items-center gap-3 rounded-[14px] bg-raised px-3 py-2.5">
    <img src={getFileIcon(entry.type)} alt="" draggable={false} className="size-7 shrink-0 object-contain" />
    <div className="min-w-0 flex-1">
      <p className="truncate text-[13px] font-semibold text-text">{entry.name}</p>
      <p className="truncate text-xs text-muted">{getHistoryDetail(entry, now)}</p>
    </div>
  </li>
);
