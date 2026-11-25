import type { FamilyId } from '@/modules/families/types/familyId';
import type { ShortcutTarget } from '@/modules/shortcuts/types/shortcutTarget';
import type { ToolIcon } from '@/modules/tools/types/toolIcon';

export interface ToolBase {
  id             : string;
  family         : FamilyId;
  icon           : ToolIcon;
  title          : string;
  description    : string;
  // Its shortcut of Glup, shown on the card with "Cambiar".
  shortcut?      : ShortcutTarget;
  // Its option in the Explorer's right click ("Convertir a…"); Rust writes the menu from it.
  menu?          : string;
  // That option asks something before it runs (a format, a level, a screen): the island opens on it.
  // Without one it runs with the usual options and only tells the end.
  menuNeedsStep? : boolean;
  // The kinds of file of that option when not only its file type (Recortar: audio and video).
  menuTypes?     : string[];
  // A rule of Carpetas automáticas can do it alone, with no screen to review it.
  auto?          : boolean;
}
