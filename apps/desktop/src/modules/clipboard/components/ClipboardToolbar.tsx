import type { KeyboardEvent, RefObject } from 'react';
import { CLIPBOARD_TEXTS } from '@/modules/clipboard/constants/texts';
import { pauseTime } from '@/modules/clipboard/utils/clipView';
import { Button } from '@/shared/components/Button';
import { SearchIcon } from '@/shared/icons/SearchIcon';

interface ClipboardToolbarProps {
  query       : string;
  pausedUntil : string | null;
  searchRef   : RefObject<HTMLInputElement | null>;
  onQuery     : (query: string) => void;
  onKeyDown   : (event: KeyboardEvent<HTMLInputElement>) => void;
  onPause     : () => void;
  onResume    : () => void;
  onTurnOff   : () => void;
}

// The search on top (it takes the focus on arrival), with the pause and the way to turn it off.
export const ClipboardToolbar = ({ query, pausedUntil, searchRef, onQuery, onKeyDown, onPause, onResume, onTurnOff }: ClipboardToolbarProps) => (
  <div className="flex shrink-0 items-center gap-2">
    <label className="flex h-10 min-w-0 flex-1 items-center gap-2.5 rounded-control border border-line-strong bg-raised px-3 text-muted focus-within:border-lilac">
      <SearchIcon className="size-4" />
      <input
        ref={searchRef}
        type="search"
        value={query}
        autoFocus
        onChange={(event) => onQuery(event.target.value)}
        onKeyDown={onKeyDown}
        placeholder={CLIPBOARD_TEXTS.search}
        aria-label={CLIPBOARD_TEXTS.searchLabel}
        aria-describedby="clipboard-copy-hint"
        spellCheck={false}
        className="h-full min-w-0 flex-1 bg-transparent text-sm text-text outline-none placeholder:text-muted"
      />
    </label>
    <span id="clipboard-copy-hint" className="sr-only">{CLIPBOARD_TEXTS.copyHint}</span>
    {pausedUntil ? (
      <>
        <span role="status" className="shrink-0 text-[12px] font-semibold text-warn">{CLIPBOARD_TEXTS.pausedUntil(pauseTime(pausedUntil))}</span>
        <Button variant="secondary" onClick={onResume} className="h-10 shrink-0 text-[12px]">
          {CLIPBOARD_TEXTS.resume}
        </Button>
      </>
    ) : (
      <Button variant="secondary" onClick={onPause} className="h-10 shrink-0 text-[12px]">
        {CLIPBOARD_TEXTS.pause}
      </Button>
    )}
    <Button variant="secondary" onClick={onTurnOff} className="h-10 shrink-0 text-[12px]">
      {CLIPBOARD_TEXTS.turnOff}
    </Button>
  </div>
);
