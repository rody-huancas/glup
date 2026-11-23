import type { ShortcutTarget } from '@/modules/shortcuts/types/shortcutTarget';
import type { ToolIcon } from '@/modules/tools/types/toolIcon';
import type { ToolSection } from '@/modules/tools/types/toolSection';

export interface ToolBase {
  id          : string;
  section     : ToolSection;
  icon        : ToolIcon;
  title       : string;
  description : string;
  // Its shortcut of Glup, shown on the card with "Cambiar".
  shortcut?   : ShortcutTarget;
}
