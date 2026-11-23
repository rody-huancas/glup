interface NextFocusParams {
  // Position of the focused element among the focusable ones (-1 when the focus is elsewhere).
  current   : number;
  count     : number;
  backwards : boolean;
}

// Where Tab (or Shift+Tab) takes the focus inside a dialog: it wraps around and never leaves.
export const nextFocusIndex = ({ current, count, backwards }: NextFocusParams): number | null => {
  if (count === 0) return null;
  if (current < 0) return backwards ? count - 1 : 0;

  return backwards ? (current - 1 + count) % count : (current + 1) % count;
};
