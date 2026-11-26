import type { Tool } from '@/modules/tools/types/tool';

interface ShortcutParams {
  favorites : Tool[];
  // The most used, most used first.
  used      : Tool[];
  popular   : Tool[];
  limit     : number;
}

// The favorites first; what is missing, the most used; and without a history, the popular ones. Never
// the same tool twice.
export const fillShortcuts = ({ favorites, used, popular, limit }: ShortcutParams): Tool[] => {
  const chosen: Tool[] = [];
  for (const tool of [...favorites, ...used, ...popular]) {
    if (chosen.length === limit) break;
    if (!chosen.some((taken) => taken.id === tool.id)) chosen.push(tool);
  }
  return chosen;
};

// The popular ones, from their ids (an id that is not in the catalogue is left out).
export const toolsById = (ids: string[], tools: Tool[]): Tool[] => ids.flatMap((id) => tools.filter((tool) => tool.id === id));
