import { TOOLS_TEXTS } from '@/modules/tools/constants/texts';
import { SearchIcon } from '@/shared/icons/SearchIcon';

interface ToolSearchFieldProps {
  query    : string;
  onChange : (query: string) => void;
}

export const ToolSearchField = ({ query, onChange }: ToolSearchFieldProps) => (
  <label className="flex h-10 shrink-0 items-center gap-2.5 rounded-control border border-line-strong bg-raised px-3 text-muted focus-within:border-lilac">
    <SearchIcon className="size-4" />
    <input
      type="search"
      value={query}
      onChange={(event) => onChange(event.target.value)}
      placeholder={TOOLS_TEXTS.search}
      aria-label={TOOLS_TEXTS.search}
      spellCheck={false}
      className="h-full min-w-0 flex-1 bg-transparent text-sm text-text outline-none placeholder:text-muted"
    />
  </label>
);
