import { revealFile } from '@/modules/actions/services/files';
import { CategoryList } from '@/modules/cleanup/components/CategoryList';
import { CleanupConfirm } from '@/modules/cleanup/components/CleanupConfirm';
import { CleanupFooter } from '@/modules/cleanup/components/CleanupFooter';
import { CleanupResult } from '@/modules/cleanup/components/CleanupResult';
import { DiskUsageBar } from '@/modules/cleanup/components/DiskUsageBar';
import { CLEANUP_TEXTS } from '@/modules/cleanup/constants/texts';
import { useCleanupScreen } from '@/modules/cleanup/hooks/useCleanupScreen';
import { PageHeader } from '@/shared/components/PageHeader';

const reveal = (path: string) => void revealFile(path).catch(() => undefined);

// Three zones that always fit the panel: title and disk on top, the categories scrolling in the
// middle, and the fixed footer with the progress or "Liberar X".
export const CleanupPage = () => {
  const screen = useCleanupScreen();
  const { phase, selected, expanded, report, expired } = screen.cleanup;
  const listed  = phase === 'scanning' || phase === 'ready' || (phase === 'cleaning' && screen.order.found.length > 0);
  const nothing = phase === 'ready' && screen.order.found.length === 0;

  return (
    <div className="relative flex h-full flex-col">
      <div className="flex shrink-0 flex-col gap-4">
        <PageHeader title={CLEANUP_TEXTS.title} subtitle={CLEANUP_TEXTS.subtitle} />
        <DiskUsageBar space={screen.disk.space} failed={screen.disk.failed} />
      </div>
      <div className="scroll-thin my-4 min-h-0 flex-1 overflow-y-auto pr-1">
        {phase === 'idle' && <p className="text-[13px] text-muted">{expired ? CLEANUP_TEXTS.expired : CLEANUP_TEXTS.intro}</p>}
        {phase === 'done' && report && <CleanupResult report={report} />}
        {nothing && <p className="mb-2 text-[13px] text-muted">{CLEANUP_TEXTS.nothing}</p>}
        {listed && (
          <CategoryList
            order={screen.order}
            selected={selected}
            expanded={expanded}
            editable={phase === 'ready'}
            onToggle={screen.toggleCategory}
            onExpand={screen.toggleExpanded}
            onToggleItem={screen.toggleItem}
            onReveal={reveal}
          />
        )}
      </div>
      <CleanupFooter
        phase={phase}
        totals={screen.totals}
        progress={screen.progress}
        name={screen.progressName}
        waiting={screen.waiting}
        cancelling={screen.cancelling}
        onScan={screen.scan}
        onCancel={screen.cancel}
        onFree={screen.askConfirm}
      />
      {screen.confirming && <CleanupConfirm totals={screen.totals} onConfirm={screen.confirm} onCancel={screen.closeConfirm} />}
    </div>
  );
};
