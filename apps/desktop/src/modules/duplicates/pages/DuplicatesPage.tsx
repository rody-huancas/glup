import { formatFileSize } from '@/modules/actions/utils/fileSize';
import { DuplicateGroupCard } from '@/modules/duplicates/components/DuplicateGroupCard';
import { DuplicatesFilters } from '@/modules/duplicates/components/DuplicatesFilters';
import { DuplicatesFooter } from '@/modules/duplicates/components/DuplicatesFooter';
import { DuplicatesSetup } from '@/modules/duplicates/components/DuplicatesSetup';
import { DUPLICATES_TEXTS } from '@/modules/duplicates/constants/texts';
import { useDuplicatesScreen } from '@/modules/duplicates/hooks/useDuplicatesScreen';
import { cancelCurrent, searchAgain, startRemove, startScan } from '@/modules/duplicates/store/duplicatesStore';
import { needsConfirm } from '@/modules/duplicates/utils/selection';
import { ConfirmDialog } from '@/shared/components/ConfirmDialog';
import { PageHeader } from '@/shared/components/PageHeader';

// Three zones that always fit the panel, like Limpieza: where to look on top (or the summary of what
// was found), the groups scrolling in the middle, and the footer with the progress or «Quitar X»
// (which asks first when it is more than 50 files or more than 1 GB).
export const DuplicatesPage = () => {
  const screen = useDuplicatesScreen();
  const { phase, folders, minSize, similar, scan, marked, report, problem } = screen.duplicates;
  const now     = new Date();
  const same    = screen.visible.filter((group) => group.kind === 'same');
  const alike   = screen.visible.filter((group) => group.kind === 'similar');
  const results = phase === 'ready' && scan;

  return (
    <div className="relative flex h-full flex-col">
      <div className="flex shrink-0 flex-col gap-3">
        <PageHeader title={DUPLICATES_TEXTS.title} subtitle={DUPLICATES_TEXTS.subtitle} />
        {!results && <DuplicatesSetup folders={folders} minSize={minSize} similar={similar} problem={problem} disabled={screen.working} />}
        {results && (
          <>
            <p className="text-[14px] font-semibold text-text">{scan.summary.message}</p>
            {scan.summary.note && <p className="-mt-2 text-[12px] text-muted">{scan.summary.note}</p>}
            <DuplicatesFilters kind={screen.kind} root={screen.root} folders={folders ?? []} onKind={screen.setKind} onRoot={screen.setRoot} />
          </>
        )}
      </div>
      <div className="scroll-thin my-4 min-h-0 flex-1 overflow-y-auto pr-1 pb-4">
        {phase === 'idle' && <p className="text-[13px] leading-relaxed text-muted">{DUPLICATES_TEXTS.intro}</p>}
        {phase === 'done' && report && (
          <div role="status" className="flex flex-col gap-1">
            <p className="text-[15px] font-semibold text-text">{report.summary.message}</p>
            {report.summary.note && <p className="text-[12px] text-muted">{report.summary.note}</p>}
          </div>
        )}
        {results && screen.filtered.length === 0 && <p className="text-[13px] text-muted">{DUPLICATES_TEXTS.nothingHere}</p>}
        {results && same.length > 0 && (
          <section className="flex flex-col gap-2">
            <h2 className="text-[12px] font-semibold text-muted">{DUPLICATES_TEXTS.same}</h2>
            <ul className="flex flex-col gap-2">
              {same.map((group) => <DuplicateGroupCard key={group.id} group={group} marked={marked} disabled={screen.working} now={now} />)}
            </ul>
          </section>
        )}
        {results && alike.length > 0 && (
          <section className="mt-4 flex flex-col gap-2">
            <h2 className="text-[12px] font-semibold text-muted">{DUPLICATES_TEXTS.alike}</h2>
            <p className="-mt-1 text-[11px] text-muted">{DUPLICATES_TEXTS.alikeHint}</p>
            <ul className="flex flex-col gap-2">
              {alike.map((group) => <DuplicateGroupCard key={group.id} group={group} marked={marked} disabled={screen.working} now={now} />)}
            </ul>
          </section>
        )}
        {results && screen.hidden > 0 && (
          <button type="button" onClick={screen.showMore} className="mt-3 cursor-pointer rounded-md text-[12px] font-semibold text-lilac outline-none hover:text-lilac-soft focus-visible:outline-2 focus-visible:outline-lilac">
            {DUPLICATES_TEXTS.more(Math.min(screen.hidden, 40))}
          </button>
        )}
      </div>
      <DuplicatesFooter
        phase={phase}
        totals={screen.totals}
        canScan={(folders ?? []).length > 0}
        progress={screen.progress}
        line={screen.progressLine}
        waiting={screen.waiting}
        cancelling={screen.cancelling}
        onScan={startScan}
        onAgain={searchAgain}
        onCancel={cancelCurrent}
        onRemove={() => (needsConfirm(screen.totals) ? screen.askConfirm() : startRemove())}
      />
      {screen.confirming && (
        <ConfirmDialog
          title={DUPLICATES_TEXTS.confirmTitle}
          body={DUPLICATES_TEXTS.confirmBody(screen.totals.count, formatFileSize(screen.totals.bytes))}
          confirm={DUPLICATES_TEXTS.confirm}
          cancel={DUPLICATES_TEXTS.keepLooking}
          onConfirm={() => {
            screen.closeConfirm();
            startRemove();
          }}
          onCancel={screen.closeConfirm}
        />
      )}
    </div>
  );
};
