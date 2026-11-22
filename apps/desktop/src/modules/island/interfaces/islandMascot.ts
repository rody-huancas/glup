// Moments of the island timelines where Glup changes its face; motion is added by the timeline itself.
export interface MascotCues {
  excite    : () => void;
  celebrate : () => void;
  farewell  : () => void;
}

export interface IslandMascot extends MascotCues {
  calm      : () => void;
  startIdle : () => void;
  stopIdle  : () => void;
}
