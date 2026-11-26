// Where the island's window and its visible area are (set_island_frame, set_island_area), so the desktop
// scene places it and the screenshots cut the panel exactly.
interface Rect {
  x      : number;
  y      : number;
  width  : number;
  height : number;
}

let frame: Rect | null = null;
let area: Rect | null  = null;
const listeners        = new Set<() => void>();

export const islandFrame = {
  setFrame  : (request: unknown) => {
    frame = (request as { rect: Rect }).rect;
    listeners.forEach((listener) => listener());
    return null;
  },
  setArea   : (rect: unknown) => {
    area = rect as Rect;
    return null;
  },
  frame     : (): Rect | null => frame,
  area      : (): Rect | null => area,
  subscribe : (listener: () => void): (() => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};
