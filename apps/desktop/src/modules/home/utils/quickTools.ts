import type { HistoryEntry } from '@/modules/history/interfaces/historyEntry';
import type { Tool } from '@/modules/tools/types/tool';

// The tool an entry of the Historial came from ("compress" is three tools: its file type tells which).
export const toolOfEntry = (entry: HistoryEntry, tools: Tool[]): Tool | null => {
  const matching = tools.filter((tool) =>
    (tool.kind === 'action' && tool.actionId === entry.action) ||
    (tool.kind === 'page' && tool.page === entry.action) ||
    (tool.kind === 'command' && tool.id === entry.action));

  return matching.find((tool) => tool.kind === 'action' && tool.fileType === entry.type) ?? matching[0] ?? null;
};

interface TopToolsParams {
  entries : HistoryEntry[];
  tools   : Tool[];
  limit   : number;
}

// The most used, by how many entries each left (ties: the most recent first, as entries come newest first).
export const topTools = ({ entries, tools, limit }: TopToolsParams): Tool[] => {
  const counts = new Map<string, { tool: Tool; count: number; order: number }>();

  entries.forEach((entry, order) => {
    const tool = toolOfEntry(entry, tools);
    if (!tool) return;
    const seen = counts.get(tool.id);
    counts.set(tool.id, { tool, count: (seen?.count ?? 0) + 1, order: seen?.order ?? order });
  });

  return [...counts.values()]
    .sort((a, b) => b.count - a.count || a.order - b.order)
    .slice(0, limit)
    .map((item) => item.tool);
};
