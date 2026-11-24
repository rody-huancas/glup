import type { Rect } from '@/shared/interfaces/rect';

// A monitor as Rust sees it, in physical pixels: all of it and its work area (without the taskbar).
export interface IslandScreen {
  id      : string;
  primary : boolean;
  scale   : number;
  bounds  : Rect;
  work    : Rect;
}
