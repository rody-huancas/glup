// The shortcut as Ajustes shows it ("Ctrl+Alt+Shift+KeyT"), whether it is on and whether another program
// already had it when Glup started.
export interface ShortcutView {
  shortcut : string;
  enabled  : boolean;
  taken    : boolean;
}
