import { LearnedRow } from '@/modules/background/components/LearnedRow';
import { LEARNABLES } from '@/modules/background/constants/learnables';
import { LEARNED_TEXTS } from '@/modules/background/constants/texts';
import { useLearned } from '@/modules/background/hooks/useLearned';
import { ConfirmDialog } from '@/modules/sign/components/ConfirmDialog';
import { Card } from '@/shared/components/Card';
import { SectionLabel } from '@/shared/components/SectionLabel';
import { Skeleton } from '@/shared/components/Skeleton';

// Ajustes › "Lo que aprendí": the tools Glup downloaded (the background model, the video program), to
// free their space.
export const LearnedSection = () => {
  const background = useLearned(LEARNABLES.background);
  const video      = useLearned(LEARNABLES.video);
  const items      = [background, video];
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

// Previous version, with the background model only.
// // Ajustes › "Lo que aprendí": the tools Glup downloaded, to free their space.
// export const LearnedSection = () => {
//   const learned   = useLearned();
//   const installed = learned.status?.installed ?? false;
//
//   return (
//     <section className="flex flex-col gap-2.5">
//       <SectionLabel>{LEARNED_TEXTS.title}</SectionLabel>
//       <Card className="p-3.5">
//         {learned.status === null ? (
//           <Skeleton className="h-9 w-64" />
//         ) : installed ? (
//           <div className="flex items-center justify-between gap-3">
//             <div className="flex min-w-0 flex-col">
//               <span className="text-[13px] font-semibold text-text">{LEARNED_TEXTS.removeBg(formatFileSize(learned.status.size))}</span>
//               {learned.failed && <span className="text-[11px] text-[#E58A9A]">{LEARNED_TEXTS.deleteError}</span>}
//             </div>
//             <Button variant="secondary" onClick={learned.ask} disabled={learned.deleting} className="h-9 shrink-0">
//               {LEARNED_TEXTS.delete}
//             </Button>
//           </div>
//         ) : (
//           <p className="text-[13px] text-muted">{LEARNED_TEXTS.nothing}</p>
//         )}
//       </Card>
//       {learned.confirming && (
//         <ConfirmDialog
//           title={LEARNED_TEXTS.confirmTitle}
//           body={LEARNED_TEXTS.confirmBody}
//           confirm={LEARNED_TEXTS.confirmDelete}
//           cancel={LEARNED_TEXTS.keep}
//           onConfirm={learned.confirm}
//           onCancel={learned.cancel}
//         />
//       )}
//     </section>
//   );
// };
