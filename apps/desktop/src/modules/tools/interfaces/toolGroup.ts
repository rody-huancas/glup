import type { FamilyId } from '@/modules/families/types/familyId';
import type { Tool } from '@/modules/tools/types/tool';

export interface ToolGroup {
  family : FamilyId;
  tools  : Tool[];
}
