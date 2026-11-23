// What a key does on the organizing screen. `step` is how many places: ±1 sideways, ±columns up or down.
export type KeyCommand =
  | { type: 'focus'; step: number }
  | { type: 'move'; step: number }
  | { type: 'remove' }
  | { type: 'undo' }
  | { type: 'redo' }
  | { type: 'select-all' }
  | { type: 'escape' };
