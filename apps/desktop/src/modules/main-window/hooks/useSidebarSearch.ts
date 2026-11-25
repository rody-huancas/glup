import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import type { SearchResult } from '@/modules/main-window/interfaces/searchResult';
import { searchSidebar, stepIndex } from '@/modules/main-window/utils/sidebarSearch';
import { TOOLS } from '@/modules/tools/constants/tools';

// The search of the side bar as a combobox: typing filters, up and down choose, Enter opens, Esc closes.
// Ctrl+K brings it from any screen of the panel.
export const useSidebarSearch = (onChoose: (result: SearchResult) => void) => {
  const input                 = useRef<HTMLInputElement | null>(null);
  const [query, setQuery]     = useState('');
  const [open, setOpen]       = useState(false);
  const [active, setActive]   = useState(-1);
  const results               = useMemo(() => searchSidebar(query, TOOLS), [query]);

  useEffect(() => {
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        input.current?.focus();
        input.current?.select();
        setOpen(true);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    setActive(-1);
  }, []);

  const choose = useCallback((result: SearchResult) => {
    close();
    setQuery('');
    input.current?.blur();
    onChoose(result);
  }, [close, onChoose]);

  const change = useCallback((value: string) => {
    setQuery(value);
    setOpen(true);
    setActive(value.trim() ? 0 : -1);
  }, []);

  const onKeyDown = useCallback((event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      setOpen(true);
      setActive((current) => stepIndex(current, event.key === 'ArrowDown' ? 1 : -1, results.length));
      return;
    }
    if (event.key === 'Enter' && open) {
      event.preventDefault();
      const result = results[active] ?? results[0];
      if (result) choose(result);
      return;
    }
    if (event.key === 'Escape' && (open || query)) {
      // Only the search closes, not the panel.
      event.preventDefault();
      event.stopPropagation();
      close();
      setQuery('');
    }
  }, [results, active, open, query, choose, close]);

  return { input, query, open, active, results, change, choose, close, setActive, show: () => setOpen(true), onKeyDown };
};
