// The check of one history line.
export interface HistoryItemSelection {
  checked  : boolean;
  onToggle : (id: string) => void;
}
