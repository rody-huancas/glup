import { FAMILIES, FAMILY_IDS } from '@/modules/families/constants/families';
import { SEARCH_LIMITS, SETTING_ENTRIES } from '@/modules/main-window/constants/sidebar';
import type { SearchResult } from '@/modules/main-window/interfaces/searchResult';
import type { Tool } from '@/modules/tools/types/tool';
import { normalizeText } from '@/modules/tools/utils/search';

const ALL_TOOLS: SearchResult = { kind: 'all-tools', id: 'all-tools' };

// Every word typed, in any order, in the text (accents and capitals do not matter).
const matches = (text: string, words: string[]): boolean => {
  const haystack = normalizeText(text);
  return words.every((word) => haystack.includes(word));
};

// Families first (a whole group), then tools, then settings; "Ver todas las herramientas" always last.
// With nothing typed, only that one.
export const searchSidebar = (query: string, tools: Tool[]): SearchResult[] => {
  const words = normalizeText(query).split(/\s+/).filter(Boolean);
  if (words.length === 0) return [ALL_TOOLS];

  const families = FAMILY_IDS.filter((family) => matches(`${FAMILIES[family].name} ${FAMILIES[family].hint}`, words))
    .slice(0, SEARCH_LIMITS.families)
    .map((family): SearchResult => ({ kind: 'family', id: `family-${family}`, family }));
  // A tool answers to its name, its description and its family ("pdf" finds Unir and Separar).
  const found    = tools.filter((tool) => matches(`${tool.title} ${tool.description} ${FAMILIES[tool.family].name}`, words))
    .slice(0, SEARCH_LIMITS.tools)
    .map((tool): SearchResult => ({ kind: 'tool', id: `tool-${tool.id}`, tool }));
  const settings = SETTING_ENTRIES.filter((setting) => matches(`${setting.title} ${setting.keywords}`, words))
    .slice(0, SEARCH_LIMITS.settings)
    .map((setting): SearchResult => ({ kind: 'setting', id: `setting-${setting.id}`, setting }));

  return [...families, ...found, ...settings, ALL_TOOLS];
};

// Up and down through the results, around the ends.
export const stepIndex = (index: number, step: number, count: number): number => (count === 0 ? -1 : (index + step + count) % count);
