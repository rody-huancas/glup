interface NextClipParams {
  // The line with the focus (-1: the search field).
  current : number;
  count   : number;
  key     : string;
}

// Arrows move one line (up from the first goes back to the search: -1), Home and End jump to the ends.
// null: not a key of the list.
export const nextClipIndex = ({ current, count, key }: NextClipParams): number | null => {
  if (count === 0) return null;
  if (key === 'ArrowDown') return Math.min(current + 1, count - 1);
  if (key === 'ArrowUp') return Math.max(current - 1, -1);
  if (key === 'Home') return 0;
  if (key === 'End') return count - 1;
  return null;
};
