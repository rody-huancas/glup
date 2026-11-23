export interface TurnOffOutcome {
  // The Portapapeles ends up on (only when the dialog was dismissed).
  enabled   : boolean;
  // Everything kept goes, pinned included.
  deleteAll : boolean;
}
