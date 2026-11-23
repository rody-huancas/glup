import type { ToolIcon } from '@/modules/tools/types/toolIcon';
import type { ToolSection } from '@/modules/tools/types/toolSection';

export interface ToolBase {
  id          : string;
  section     : ToolSection;
  icon        : ToolIcon;
  title       : string;
  description : string;
}
