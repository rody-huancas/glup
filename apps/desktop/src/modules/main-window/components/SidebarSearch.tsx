import { useId } from 'react';
import { SidebarSearchOption } from '@/modules/main-window/components/SidebarSearchOption';
import { SIDEBAR_TEXTS } from '@/modules/main-window/constants/sidebar';
import { useSidebarSearch } from '@/modules/main-window/hooks/useSidebarSearch';
import type { SearchResult } from '@/modules/main-window/interfaces/searchResult';
import { SearchIcon } from '@/shared/icons/SearchIcon';

interface SidebarSearchProps {
  onChoose: (result: SearchResult) => void;
}

// "Buscar" with its "Ctrl K": a combobox whose list opens over the page (tools, families, settings and
// "Ver todas las herramientas").
export const SidebarSearch = ({ onChoose }: SidebarSearchProps) => {
  const search  = useSidebarSearch(onChoose);
  const listId  = useId();
  const typed   = search.query.trim() !== '';
  const nothing = typed && search.results.length === 1;
  const current = search.results[search.active];

  return (
    <div className="relative mb-3 shrink-0">
      <label className="flex h-9 items-center gap-2 rounded-control border border-line bg-surface px-2.5 text-muted transition-colors focus-within:border-lilac">
        <SearchIcon className="size-4 shrink-0" />
        <input
          ref={search.input}
          role="combobox"
          aria-label={SIDEBAR_TEXTS.searchLabel}
          aria-expanded={search.open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={search.open && current ? current.id : undefined}
          value={search.query}
          placeholder={SIDEBAR_TEXTS.search}
          onChange={(event) => search.change(event.target.value)}
          onFocus={search.show}
          onBlur={search.close}
          onKeyDown={search.onKeyDown}
          className="min-w-0 flex-1 bg-transparent text-[13px] text-text outline-none placeholder:text-muted"
        />
        {!typed && <kbd aria-hidden className="rounded border border-line-strong px-1 font-sans text-[10px] text-muted">{SIDEBAR_TEXTS.shortcut}</kbd>}
      </label>
      {search.open && (
        <div className="absolute top-full left-0 z-40 mt-1.5 w-[300px] rounded-[14px] border border-line-strong bg-surface p-1.5 shadow-2xl">
          {nothing && <p className="px-2 py-1.5 text-[12px] text-muted">{SIDEBAR_TEXTS.nothing}</p>}
          <ul id={listId} role="listbox" aria-label={SIDEBAR_TEXTS.results} className="flex flex-col gap-0.5">
            {search.results.map((result, index) => (
              <SidebarSearchOption key={result.id} result={result} active={index === search.active} onChoose={search.choose} onHover={() => search.setActive(index)} />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
