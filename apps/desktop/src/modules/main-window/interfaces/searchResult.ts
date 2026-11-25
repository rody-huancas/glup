import type { FamilyId } from '@/modules/families/types/familyId';
import type { SettingEntry } from '@/modules/main-window/interfaces/settingEntry';
import type { Tool } from '@/modules/tools/types/tool';

// What the side bar's search can open: a tool, a family, a setting, or the whole Habilidades screen.
export type SearchResult =
  | { kind: 'tool'; id: string; tool: Tool }
  | { kind: 'family'; id: string; family: FamilyId }
  | { kind: 'setting'; id: string; setting: SettingEntry }
  | { kind: 'all-tools'; id: string };
