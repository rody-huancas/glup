// Where the cursor goes while the island is dragged (physical pixels), and whether it was dropped.
export interface DragUpdate {
  x    : number;
  y    : number;
  done : boolean;
}
