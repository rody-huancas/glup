import type { PageProps } from '@/modules/main-window/interfaces/pageProps';
import { CloseAppDialog } from '@/modules/performance/components/CloseAppDialog';
import { DiskSpaceRow } from '@/modules/performance/components/DiskSpaceRow';
import { PerformanceSkeleton } from '@/modules/performance/components/PerformanceSkeleton';
import { PowerAndTime } from '@/modules/performance/components/PowerAndTime';
import { StartupList } from '@/modules/performance/components/StartupList';
import { TopApps } from '@/modules/performance/components/TopApps';
import { UsageSummary } from '@/modules/performance/components/UsageSummary';
import { PERFORMANCE_TEXTS } from '@/modules/performance/constants/texts';
import { useCloseApp } from '@/modules/performance/hooks/useCloseApp';
import { useOverview } from '@/modules/performance/hooks/useOverview';
import { useStartupApps } from '@/modules/performance/hooks/useStartupApps';
import { PageHeader } from '@/shared/components/PageHeader';
import { SectionLabel } from '@/shared/components/SectionLabel';

// What the PC is using now (read only while in view), its disks, battery and time on, the apps using
// the most (each can be closed, asking first) and what starts with Windows.
export const PerformancePage = ({ onNavigate }: PageProps) => {
  const { overview, failed, refresh } = useOverview();
  const startup                       = useStartupApps();
  const closing                       = useCloseApp(() => void refresh());

  return (
    <div className="relative flex h-full flex-col">
      <div className="shrink-0">
        <PageHeader title={PERFORMANCE_TEXTS.title} subtitle={PERFORMANCE_TEXTS.subtitle} />
      </div>
      <div className="scroll-thin my-4 flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto pr-1 pb-4">
        {failed && !overview && <p role="alert" className="text-[13px] text-lilac-soft">{PERFORMANCE_TEXTS.loadError}</p>}
        {!overview && !failed && <PerformanceSkeleton />}
        {overview && (
          <>
            <div className="flex flex-col gap-2">
              <UsageSummary overview={overview} />
              <PowerAndTime overview={overview} />
            </div>
            {overview.disks.length > 0 && (
              <section className="flex flex-col gap-2">
                <SectionLabel>{PERFORMANCE_TEXTS.spaceTitle}</SectionLabel>
                <ul className="flex flex-col gap-3 rounded-[14px] border border-line bg-raised p-3">
                  {overview.disks.map((disk) => (
                    <DiskSpaceRow key={disk.root} disk={disk} onCleanup={() => onNavigate('cleanup')} />
                  ))}
                </ul>
              </section>
            )}
            <TopApps apps={overview.apps} onClose={closing.ask} />
          </>
        )}
        <StartupList entries={startup.entries} busy={startup.busy} error={startup.error} onToggle={startup.toggle} />
      </div>
      {closing.request && (
        <CloseAppDialog request={closing.request} noWindow={closing.noWindow} onConfirm={closing.confirm} onForce={closing.force} onCancel={closing.cancel} />
      )}
    </div>
  );
};
