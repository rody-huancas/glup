import { HistoryItem } from '@/modules/history/components/HistoryItem';
import { HISTORY_TEXTS } from '@/modules/history/constants/history';
import type { HistoryEntry } from '@/modules/history/interfaces/historyEntry';

interface HistoryListProps {
  entries    : HistoryEntry[];
  now        : Date;
  missingId  : string | null;
  expandedId : string | null;
  // Only in Historial: the lines marked and how to mark one.
  selected?  : string[];
  onSelect?  : (id: string) => void;
  onOpen     : (entry: HistoryEntry) => void;
  onExpand   : (id: string) => void;
}

export const HistoryList = ({ entries, now, missingId, expandedId, selected, onSelect, onOpen, onExpand }: HistoryListProps) => {
  if (entries.length === 0) return <p className="text-[13px] text-muted">{HISTORY_TEXTS.empty}</p>;

  return (
    <ul className="flex flex-col gap-2">
      {entries.map((entry) => (
        <HistoryItem
          key={entry.id}
          entry={entry}
          now={now}
          missing={entry.id === missingId}
          expanded={entry.id === expandedId}
          selection={selected && onSelect ? { checked: selected.includes(entry.id), onToggle: onSelect } : undefined}
          onOpen={onOpen}
          onExpand={onExpand}
        />
      ))}
    </ul>
  );
};
