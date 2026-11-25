import { MAIN_WINDOW_TEXTS } from '@/modules/main-window/constants/mainWindow';
import { pageTitle } from '@/modules/main-window/utils/pageTitle';
import type { PageId } from '@/modules/main-window/types/pageId';
import { ArrowLeftIcon } from '@/shared/icons/ArrowLeftIcon';

interface BackLinkProps {
  target     : PageId;
  onNavigate : (page: PageId) => void;
}

// «← Habilidades» over a screen entered from another (Esc, Alt+← and the mouse's back button too).
export const BackLink = ({ target, onNavigate }: BackLinkProps) => (
  <button
    type="button"
    onClick={() => onNavigate(target)}
    title={MAIN_WINDOW_TEXTS.backHint}
    className="mb-3 flex h-7 shrink-0 cursor-pointer items-center gap-1.5 self-start rounded-md pr-2 text-[13px] font-semibold text-muted outline-none hover:text-text focus-visible:outline-2 focus-visible:outline-lilac"
  >
    <ArrowLeftIcon className="size-4" />
    {pageTitle(target)}
  </button>
);
