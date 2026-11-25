import { LearnedRow } from '@/modules/background/components/LearnedRow';
import { LEARNABLES } from '@/modules/background/constants/learnables';
import { LEARNED_TEXTS } from '@/modules/background/constants/texts';
import { useLearned } from '@/modules/background/hooks/useLearned';
import { Card } from '@/shared/components/Card';
import { ConfirmDialog } from '@/shared/components/ConfirmDialog';
import { SectionLabel } from '@/shared/components/SectionLabel';
import { Skeleton } from '@/shared/components/Skeleton';

// Ajustes › "Lo que aprendí": the tools Glup downloaded (the background model, the video program, the
// models to listen and to improve photos), to free their space.
export const LearnedSection = () => {
  const background = useLearned(LEARNABLES.background);
  const video      = useLearned(LEARNABLES.video);
  const fast       = useLearned(LEARNABLES['transcribe-fast']);
  const precise    = useLearned(LEARNABLES['transcribe-precise']);
  const quick      = useLearned(LEARNABLES['upscale-fast']);
  const detailed   = useLearned(LEARNABLES['upscale-detail']);
  const items      = [background, video, fast, precise, quick, detailed];
  const installed  = items.filter((item) => item.status?.installed);
  const confirming = items.find((item) => item.confirming) ?? null;
  const loading    = items.some((item) => item.status === null);

  return (
    <section className="flex flex-col gap-2.5">
      <SectionLabel>{LEARNED_TEXTS.title}</SectionLabel>
      <Card className="flex flex-col gap-3 p-3.5">
        {loading && installed.length === 0 && <Skeleton className="h-9 w-64" />}
        {installed.map((item) => <LearnedRow key={item.learnable.id} item={item} />)}
        {!loading && installed.length === 0 && <p className="text-[13px] text-muted">{LEARNED_TEXTS.nothing}</p>}
      </Card>
      {confirming && (
        <ConfirmDialog
          title={LEARNED_TEXTS.confirmTitle}
          body={confirming.learnable.texts.deleteBody}
          confirm={LEARNED_TEXTS.confirmDelete}
          cancel={LEARNED_TEXTS.keep}
          onConfirm={confirming.confirm}
          onCancel={confirming.cancel}
        />
      )}
    </section>
  );
};
