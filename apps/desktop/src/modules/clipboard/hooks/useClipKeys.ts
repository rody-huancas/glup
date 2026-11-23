import { useCallback, useRef } from 'react';
import type { KeyboardEvent } from 'react';
import { nextClipIndex } from '@/modules/clipboard/utils/clipNavigation';

const LINE_SELECTOR = '[data-clip-line]';

interface UseClipKeysParams {
  count     : number;
  query     : string;
  setQuery  : (query: string) => void;
  // Enter in the search copies the first line found.
  onCopyTop : () => void;
}

// The whole screen by keyboard: arrows (and Home, End) between the search and the lines, Enter copies
// (a line's own button), Esc clears the search first and, empty, lets the island close.
export const useClipKeys = ({ count, query, setQuery, onCopyTop }: UseClipKeysParams) => {
  const listRef   = useRef<HTMLUListElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const lines = () => Array.from(listRef.current?.querySelectorAll<HTMLButtonElement>(LINE_SELECTOR) ?? []);

  const focusLine = useCallback((index: number) => {
    if (index < 0) return searchRef.current?.focus();
    lines()[index]?.focus();
  }, []);

  const move = useCallback((event: KeyboardEvent, current: number) => {
    const next = nextClipIndex({ current, count, key: event.key });
    if (next === null) return;

    event.preventDefault();
    focusLine(next);
  }, [count, focusLine]);

  const onSearchKeyDown = useCallback((event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape' && query) {
      event.preventDefault();
      event.stopPropagation();
      setQuery('');
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      onCopyTop();
      return;
    }

    if (event.key === 'ArrowDown') move(event, -1);
  }, [query, setQuery, onCopyTop, move]);

  const onListKeyDown = useCallback((event: KeyboardEvent<HTMLUListElement>) => {
    const current = lines().indexOf(document.activeElement as HTMLButtonElement);
    if (current >= 0) move(event, current);
  }, [move]);

  return { listRef, searchRef, onSearchKeyDown, onListKeyDown };
};
