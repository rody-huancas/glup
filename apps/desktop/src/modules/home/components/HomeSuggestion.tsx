import { DASHBOARD_TEXTS } from '@/modules/home/constants/dashboard';
import type { Suggestion } from '@/modules/home/interfaces/suggestion';
import type { PageId } from '@/modules/main-window/types/pageId';
import { FamilyGlup } from '@/modules/families/components/FamilyGlup';
import { CloseIcon } from '@/shared/icons/CloseIcon';

interface HomeSuggestionProps {
  suggestion : Suggestion;
  onNavigate : (page: PageId) => void;
  onClose    : () => void;
}

// A thin line of Glup between the shortcuts and the row under them, only when there is something useful
// to do, with its link and ×.
export const HomeSuggestion = ({ suggestion, onNavigate, onClose }: HomeSuggestionProps) => (
  <section role="status" className="flex shrink-0 items-center gap-2 rounded-full border border-lilac/25 bg-raised/60 py-0.5 pr-0.5 pl-1.5">
    <FamilyGlup family="pc" className="size-5" />
    <p className="min-w-0 flex-1 truncate text-[12px] text-text" title={suggestion.text}>{suggestion.text}</p>
    <button
      type="button"
      onClick={() => onNavigate(suggestion.page)}
      className="h-7 shrink-0 cursor-pointer rounded-full px-2.5 text-[12px] font-semibold text-lilac outline-none hover:bg-line focus-visible:outline-2 focus-visible:outline-lilac"
    >
      {suggestion.action}
    </button>
    <button
      type="button"
      onClick={onClose}
      aria-label={DASHBOARD_TEXTS.close}
      title={DASHBOARD_TEXTS.close}
      className="flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-full text-muted outline-none hover:bg-line hover:text-text focus-visible:outline-2 focus-visible:outline-lilac"
    >
      <CloseIcon className="size-3.5" />
    </button>
  </section>
);
