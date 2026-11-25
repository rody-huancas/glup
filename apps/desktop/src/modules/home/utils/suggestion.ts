import { DASHBOARD_TEXTS, SUGGESTION_LIMITS } from '@/modules/home/constants/dashboard';
import type { Suggestion } from '@/modules/home/interfaces/suggestion';
import type { SuggestionFacts } from '@/modules/home/interfaces/suggestionFacts';

const step = (bytes: number): number => Math.round(bytes / SUGGESTION_LIMITS.keyStep);

// Every suggestion the facts allow, most urgent first: little room on the disk, what Limpieza found,
// Descargas to sort.
export const suggestionsFor = (facts: SuggestionFacts): Suggestion[] => {
  const found: Suggestion[] = [];
  const { disk, cleanup, downloads } = facts;

  if (disk && disk.total > 0 && disk.free / disk.total < SUGGESTION_LIMITS.lowDisk) {
    found.push({ key: `low-disk:${step(disk.free)}`, text: DASHBOARD_TEXTS.lowDisk(disk.free), action: DASHBOARD_TEXTS.lowDiskGo, page: 'cleanup' });
  }
  if (cleanup !== null && cleanup >= SUGGESTION_LIMITS.cleanupBytes) {
    found.push({ key: `cleanup:${step(cleanup)}`, text: DASHBOARD_TEXTS.cleanup(cleanup), action: DASHBOARD_TEXTS.cleanupGo, page: 'cleanup' });
  }
  if (downloads && downloads.count > 0 && (downloads.bytes >= SUGGESTION_LIMITS.downloadsBytes || downloads.count >= SUGGESTION_LIMITS.downloadsCount)) {
    found.push({ key: `downloads:${step(downloads.bytes)}:${downloads.count}`, text: DASHBOARD_TEXTS.downloads(downloads.bytes, downloads.count), action: DASHBOARD_TEXTS.downloadsGo, page: 'folder-sort' });
  }

  return found;
};

// The one to show: the first that was not closed as it is now.
export const pickSuggestion = (facts: SuggestionFacts): Suggestion | null =>
  suggestionsFor(facts).find((suggestion) => !facts.dismissed.includes(suggestion.key)) ?? null;

// Closed: remembered (the newest last), only the last few.
export const dismissSuggestion = (dismissed: string[], key: string): string[] =>
  [...dismissed.filter((item) => item !== key), key].slice(-SUGGESTION_LIMITS.remembered);
