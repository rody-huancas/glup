// How a region of the window takes clicks: not at all (hidden at rest, only the cursor tracker watches
// it) and, round, only inside its circle (the resting bubble).
export interface RegionShape {
  clickable : boolean;
  round     : boolean;
}
