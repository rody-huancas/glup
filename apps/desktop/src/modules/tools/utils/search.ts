import type { ToolGroup } from '@/modules/tools/interfaces/toolGroup';
import type { Tool } from '@/modules/tools/types/tool';
import type { ToolSection } from '@/modules/tools/types/toolSection';

interface GroupToolsParams {
  tools    : Tool[];
  sections : ToolSection[];
}

// Accents and capitals do not matter: "imagenes" finds "Imágenes".
export const normalizeText = (text: string): string =>
  text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim();

// Every word typed has to appear in the name or the description, in any order.
export const filterTools = (tools: Tool[], query: string): Tool[] => {
  const words = normalizeText(query).split(/\s+/).filter(Boolean);
  if (words.length === 0) return tools;

  return tools.filter((tool) => {
    const text = normalizeText(`${tool.title} ${tool.description}`);
    return words.every((word) => text.includes(word));
  });
};

// Sections in their fixed order; the ones left without tools are dropped.
export const groupTools = ({ tools, sections }: GroupToolsParams): ToolGroup[] =>
  sections
    .map((section) => ({ section, tools: tools.filter((tool) => tool.section === section) }))
    .filter((group) => group.tools.length > 0);
