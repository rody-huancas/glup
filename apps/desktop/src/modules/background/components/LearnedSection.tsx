import { formatFileSize } from '@/modules/actions/utils/fileSize';
import { LEARNED_TEXTS } from '@/modules/background/constants/texts';
import { useLearned } from '@/modules/background/hooks/useLearned';
import { ConfirmDialog } from '@/modules/sign/components/ConfirmDialog';
import { Button } from '@/shared/components/Button';
import { Card } from '@/shared/components/Card';
import { SectionLabel } from '@/shared/components/SectionLabel';
import { Skeleton } from '@/shared/components/Skeleton';

// Ajustes › "Lo que aprendí": the tools Glup downloaded, to free their space.
export const LearnedSection = () => {
  const learned   = useLearned();
  const installed = learned.status?.installed ?? false;

  return (
    <section className="flex flex-col gap-2.5">
      <SectionLabel>{LEARNED_TEXTS.title}</SectionLabel>
      <Card className="p-3.5">
        {learned.status === null ? (
          <Skeleton className="h-9 w-64" />
        ) : installed ? (
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 flex-col">
              <span className="text-[13px] font-semibold text-text">{LEARNED_TEXTS.removeBg(formatFileSize(learned.status.size))}</span>
              {learned.failed && <span className="text-[11px] text-[#E58A9A]">{LEARNED_TEXTS.deleteError}</span>}
            </div>
            <Button variant="secondary" onClick={learned.ask} disabled={learned.deleting} className="h-9 shrink-0">
              {LEARNED_TEXTS.delete}
            </Button>
          </div>
        ) : (
          <p className="text-[13px] text-muted">{LEARNED_TEXTS.nothing}</p>
        )}
      </Card>
      {learned.confirming && (
        <ConfirmDialog
          title={LEARNED_TEXTS.confirmTitle}
          body={LEARNED_TEXTS.confirmBody}
          confirm={LEARNED_TEXTS.confirmDelete}
          cancel={LEARNED_TEXTS.keep}
          onConfirm={learned.confirm}
          onCancel={learned.cancel}
        />
      )}
    </section>
  );
};
