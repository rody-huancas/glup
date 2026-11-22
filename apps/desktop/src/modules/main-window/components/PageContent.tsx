import { PanelControls } from '@/modules/main-window/components/PanelControls';
import { PAGES } from '@/modules/main-window/constants/pages';
import type { PanelControlsProps } from '@/modules/main-window/interfaces/mainPanel';
import type { PageProps } from '@/modules/main-window/interfaces/pageProps';
import type { PageId } from '@/modules/main-window/types/pageId';

interface PageContentProps extends PageProps {
  page     : PageId;
  controls : PanelControlsProps;
}

export const PageContent = ({ page, files, onNavigate, controls }: PageContentProps) => {
  const Page = PAGES[page];

  return (
    <main className="relative my-3 mr-3 min-w-0 flex-1 rounded-[18px] border border-line bg-surface">
      <PanelControls {...controls} />
      <div className="h-full overflow-y-auto scroll-thin p-8">
        <Page files={files} onNavigate={onNavigate} />
      </div>
    </main>
  );
};
