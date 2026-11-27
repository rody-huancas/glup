import type { FamilyId, ISkill } from '@/types/content.types';

export interface IToolEntry {
  family       : string;
  title        : string;
  description? : string;
}

// The skills of one family, in the app's order (tools.json), without repeats.
export const skillsOf = (tools: IToolEntry[], family: FamilyId): ISkill[] => {
  const seen = new Set<string>();

  return tools
    .filter((tool) => tool.family === family && !seen.has(tool.title) && Boolean(seen.add(tool.title)))
    .map((tool) => ({ title: tool.title, description: tool.description ?? '' }));
};
