import type { Tool } from '@/modules/tools/types/tool';
import type { ToolSection } from '@/modules/tools/types/toolSection';

export interface ToolGroup {
  section : ToolSection;
  tools   : Tool[];
}
