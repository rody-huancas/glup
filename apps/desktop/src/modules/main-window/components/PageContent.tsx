import { BackLink } from '@/modules/main-window/components/BackLink';
import { PanelControls } from '@/modules/main-window/components/PanelControls';
import { PAGES, SELF_SCROLLING } from '@/modules/main-window/constants/pages';
import { usePageTransition } from '@/modules/main-window/hooks/usePageTransition';
import type { PanelControlsProps } from '@/modules/main-window/interfaces/mainPanel';
import type { PageProps } from '@/modules/main-window/interfaces/pageProps';
import type { PageId } from '@/modules/main-window/types/pageId';
import { backTarget } from '@/modules/main-window/utils/backTarget';
import { TaskToastBar } from '@/modules/notices/components/TaskToastBar';
import { PanelStripContext } from '@/shared/contexts/panelStrip';
import { useBackNavigation } from '@/shared/hooks/useBackNavigation';
import { cx } from '@/shared/utils/classNames';
import { useState } from 'react';

interface PageContentProps extends PageProps {
  page     : PageId;
  controls : PanelControlsProps;
}

// A screen that scrolls whole keeps its natural height, so the padding of the box stays after its end
// (held to the box's height, its end would sit on the edge). One with its own list fills the box. A
// screen entered from another (a family, a tool's screen) has its way back. The strip above what scrolls
// holds the way back, the title of the screen and its way (PageHeader), and Fijar and Recoger: nothing
// passes under them.
export const PageContent = ({ page, files, onNavigate, controls }: PageContentProps) => {
  const Page              = PAGES[page];
  const box               = usePageTransition(page);
  const back              = backTarget(page);
  const [strip, setStrip] = useState<HTMLElement | null>(null);

  useBackNavigation({ enabled: back !== null, onBack: () => back && onNavigate(back) });

  return (
    <main className="relative my-3 mr-3 flex min-w-0 flex-1 flex-col rounded-[18px] border border-line bg-surface">
      <div className="flex min-h-11 shrink-0 items-center gap-3 pt-3 pr-3 pl-8">
        {back && <BackLink target={back} onNavigate={onNavigate} />}
        <div ref={setStrip} className="flex min-w-0 flex-1 items-center" />
        <PanelControls {...controls} />
      </div>
      <PanelStripContext.Provider value={strip}>
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto scroll-thin px-8 pt-3 pb-8">
          <TaskToastBar onNavigate={onNavigate} />
          <div ref={box} className={cx(SELF_SCROLLING.includes(page) ? 'min-h-0 flex-1' : 'shrink-0')}>
            <Page page={page} files={files} onNavigate={onNavigate} />
          </div>
        </div>
      </PanelStripContext.Provider>
    </main>
  );
};
