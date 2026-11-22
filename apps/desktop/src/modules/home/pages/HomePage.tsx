import { DropZone } from '@/modules/home/components/DropZone';
import { HomeActionsCard } from '@/modules/home/components/HomeActionsCard';
import { QuickTools } from '@/modules/home/components/QuickTools';
import { RecentActivity } from '@/modules/home/components/RecentActivity';
import { TipCard } from '@/modules/home/components/TipCard';
import { HOME_TEXTS } from '@/modules/home/constants/home';
import type { PageProps } from '@/modules/main-window/interfaces/pageProps';
import { PageHeader } from '@/shared/components/PageHeader';

// Sized to fit the panel without scrolling: the actions take the place of the tip and the quick tools.
// The recent column leaves room at the top for the island controls.
export const HomePage = ({ files, onNavigate }: PageProps) => (
  <div className="flex flex-col gap-3.5">
    <div className="grid grid-cols-[minmax(0,1fr)_220px] gap-5">
      <div className="flex min-w-0 flex-col gap-3.5">
        <PageHeader title={HOME_TEXTS.title} subtitle={HOME_TEXTS.subtitle} />
        <DropZone files={files} />
        {files.selection ? <HomeActionsCard files={files} /> : <TipCard />}
      </div>
      <div className="pt-6">
        {/* <div className="pt-9"> */}
        <RecentActivity onSeeAll={() => onNavigate('history')} />
      </div>
    </div>
    {!files.selection && <QuickTools />}
    {/* {files.selection ? <HomeActionsCard files={files} /> : <QuickTools />} */}
  </div>
);
