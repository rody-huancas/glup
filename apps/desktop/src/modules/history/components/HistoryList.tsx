import { HistoryItem } from '@/modules/history/components/HistoryItem';
import { HISTORY_TEXTS } from '@/modules/history/constants/history';
import type { HistoryEntry } from '@/modules/history/interfaces/historyEntry';

interface HistoryListProps {
  entries   : HistoryEntry[];
  now       : Date;
  missingId : string | null;
  onOpen    : (entry: HistoryEntry) => void;
}

export const HistoryList = ({ entries, now, missingId, onOpen }: HistoryListProps) => {
  if (entries.length === 0) return <p className="text-[13px] text-muted">{HISTORY_TEXTS.empty}</p>;

  return (
    <ul className="flex flex-col gap-2">
      {entries.map((entry) => (
        <HistoryItem key={entry.id} entry={entry} now={now} missing={entry.id === missingId} onOpen={onOpen} />
      ))}
    </ul>
  );
};
