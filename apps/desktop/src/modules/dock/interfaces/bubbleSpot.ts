// Where the bubble floats, as settings.json keeps it: its middle as shares (0 to 1) of the work area of
// its screen, and the screen (null: the main one). Shares keep the same spot on another resolution.
export interface BubbleSpot {
  x      : number;
  y      : number;
  screen : string | null;
}
