// The parts of a keydown that make a shortcut (code, not key: the same whatever the keyboard layout).
export interface KeyPress {
  code     : string;
  ctrlKey  : boolean;
  altKey   : boolean;
  shiftKey : boolean;
  metaKey  : boolean;
}
