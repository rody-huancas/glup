import type { FamilyId } from '@/modules/families/types/familyId';
import type { ShortcutTarget } from '@/modules/shortcuts/types/shortcutTarget';
import type { ToolIcon } from '@/modules/tools/types/toolIcon';

export interface ToolBase {
  id          : string;
  family      : FamilyId;
  icon        : ToolIcon;
  title       : string;
  description : string;
  // Its shortcut of Glup, shown on the card with "Cambiar".
  shortcut?   : ShortcutTarget;
}
