import { TEXT_PREVIEW_LENGTH } from '@/modules/history/constants/history';
import type { SelectionState } from '@/modules/history/types/selectionState';

// The check of one line, on or off.
export const toggleId = (selected: string[], id: string): string[] =>
  selected.includes(id) ? selected.filter((current) => current !== id) : [...selected, id];

// "Seleccionar todo": everything, or nothing when everything already was.
export const toggleAll = (selected: string[], ids: string[]): string[] =>
  ids.length > 0 && ids.every((id) => selected.includes(id)) ? [] : [...ids];

export const selectionState = (selected: string[], ids: string[]): SelectionState => {
  const marked = ids.filter((id) => selected.includes(id)).length;
  if (marked === 0) return 'none';
  return marked === ids.length ? 'all' : 'some';
};

// Lines that left the list (removed, or pushed out past the limit) are no longer selected.
export const keepPresent = (selected: string[], ids: string[]): string[] => selected.filter((id) => ids.includes(id));

// The start of a copied text, on one line: "Hola, te escribo para…".
export const textPreview = (text: string, length: number = TEXT_PREVIEW_LENGTH): string => {
  const line = text.replace(/\s+/g, ' ').trim();
  return line.length > length ? `${line.slice(0, length).trimEnd()}…` : line;
};
