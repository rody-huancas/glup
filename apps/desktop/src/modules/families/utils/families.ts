import type { SelectionType } from '@/modules/actions/types/fileType';
import { FAMILY_IDS } from '@/modules/families/constants/families';
import type { FamilyId, FamilyPageId } from '@/modules/families/types/familyId';
import type { PageId } from '@/modules/main-window/types/pageId';
import type { Task } from '@/modules/tasks/interfaces/task';
import type { Tool } from '@/modules/tools/types/tool';

export const familyPage = (family: FamilyId): FamilyPageId => `family-${family}`;

export const familyOfPage = (page: PageId): FamilyId | null => FAMILY_IDS.find((family) => familyPage(family) === page) ?? null;

export const toolsOf = (tools: Tool[], family: FamilyId): Tool[] => tools.filter((tool) => tool.family === family);

// Screens of their own that belong to a family.
const OWNER_FAMILIES: Partial<Record<PageId, FamilyId>> = {
  'cleanup'     : 'pc',
  'folder-sort' : 'pc',
  'performance' : 'pc',
  'duplicates'  : 'pc',
  'clipboard'   : 'clipboard',
};

// When one action lives in several families ("Reducir peso"), the files decide.
const TYPE_FAMILIES: Record<SelectionType, FamilyId> = {
  'image'      : 'images',
  'pdf'        : 'pdf',
  'pdf-mixed'  : 'pdf',
  'pdf-locked' : 'pdf',
  'video'      : 'media',
  'audio'      : 'media',
  'mixed'      : 'pc',
};

type TaskFacts = Pick<Task, 'actionId' | 'type' | 'owner'>;

// The family of the tool a task runs, for its color; null when it has none (a download alone).
export const familyOfTask = (task: TaskFacts, tools: Tool[]): FamilyId | null => {
  const owned = OWNER_FAMILIES[task.owner];
  if (owned) return owned;
  if (!task.actionId) return null;

  const families = [...new Set(tools.filter((tool) => tool.kind === 'action' && tool.actionId === task.actionId).map((tool) => tool.family))];
  if (families.length === 1) return families[0];
  return task.type ? TYPE_FAMILIES[task.type] : families[0] ?? null;
};

// "98 GB libres": whole gigabytes, as people say it.
export const wholeGigabytes = (bytes: number): number => Math.round(bytes / 1024 ** 3);
