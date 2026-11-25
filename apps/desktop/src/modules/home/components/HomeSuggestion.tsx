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

// One line of Glup when there is something useful to do, with its button and ×.
export const HomeSuggestion = ({ suggestion, onNavigate, onClose }: HomeSuggestionProps) => (
  <section role="status" className="flex shrink-0 items-center gap-3 rounded-[14px] border border-lilac/30 bg-raised py-1 pr-1 pl-2">
    <FamilyGlup family="pc" className="size-7" />
    <p className="min-w-0 flex-1 text-[13px] leading-snug text-text">{suggestion.text}</p>
    <button
      type="button"
      onClick={() => onNavigate(suggestion.page)}
      className="h-8 shrink-0 cursor-pointer rounded-control bg-lilac px-3 text-[12px] font-semibold text-bg outline-none hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-lilac"
    >
      {suggestion.action}
    </button>
    <button
      type="button"
      onClick={onClose}
      aria-label={DASHBOARD_TEXTS.close}
      title={DASHBOARD_TEXTS.close}
      className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-control text-muted outline-none hover:bg-line hover:text-text focus-visible:outline-2 focus-visible:outline-lilac"
    >
      <CloseIcon className="size-3.5" />
    </button>
  </section>
);
