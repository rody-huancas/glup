// The Windows taskbar, as Rust reads it: hides by itself or not, and on which edge.
export interface TaskbarState {
  autohide : boolean;
  edge     : 'top' | 'bottom' | 'left' | 'right' | null;
}
