import { DropZone } from '@/modules/home/components/DropZone';
import { HomeActionsCard } from '@/modules/home/components/HomeActionsCard';
import { QuickTools } from '@/modules/home/components/QuickTools';
// import { RecentActivity } from '@/modules/home/components/RecentActivity';
// import { TipCard } from '@/modules/home/components/TipCard';
import { HOME_TEXTS } from '@/modules/home/constants/home';
import type { PageProps } from '@/modules/main-window/interfaces/pageProps';
import { PageHeader } from '@/shared/components/PageHeader';

// One full-width column; the history lives only on its own page.
// The drop zone takes the free height, so Home always fills the panel without scrolling.
export const HomePage = ({ files }: PageProps) => {
  const actionsOpen = Boolean(files.selection || files.loading);

  return (
    <div className="flex h-full flex-col gap-3">
      <PageHeader title={HOME_TEXTS.title} subtitle={HOME_TEXTS.subtitle} />
      <DropZone files={files} compact={actionsOpen} />
      {actionsOpen ? <HomeActionsCard files={files} /> : <QuickTools onRun={files.runTool} />}
    </div>
  );
};

// export const HomePage = ({ files }: PageProps) => (
//   <div className="flex flex-col gap-3.5">
//     <PageHeader title={HOME_TEXTS.title} subtitle={HOME_TEXTS.subtitle} />
//     <DropZone files={files} />
//     {files.selection || files.loading ? <HomeActionsCard files={files} /> : <QuickTools onRun={files.runTool} />}
//   </div>
// );

// The recent column leaves room at the top for the island controls.
// export const HomePage = ({ files, onNavigate }: PageProps) => (
//   <div className="flex flex-col gap-3.5">
//     <div className="grid grid-cols-[minmax(0,1fr)_220px] gap-5">
//       <div className="flex min-w-0 flex-col gap-3.5">
//         <PageHeader title={HOME_TEXTS.title} subtitle={HOME_TEXTS.subtitle} />
//         <DropZone files={files} />
//         {files.selection || files.loading ? <HomeActionsCard files={files} /> : <TipCard />}
//       </div>
//       <div className="pt-6">
//         <RecentActivity onSeeAll={() => onNavigate('history')} />
//       </div>
//     </div>
//     {!files.selection && !files.loading && <QuickTools onRun={files.runTool} />}
//   </div>
// );
