import { Mascot } from '@/modules/mascot/components/Mascot';
import { EMPTY_FACE } from '@/modules/tools/constants/empty';
import { TOOLS_TEXTS } from '@/modules/tools/constants/texts';
import { useConfusedMascot } from '@/modules/tools/hooks/useConfusedMascot';
import { openIssues } from '@/modules/tools/services/feedback';

// The search found nothing: Glup confused and a way to ask for that tool.
export const ToolsEmpty = () => {
  const mascotRef = useConfusedMascot();

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 py-8 text-center">
      <div className="w-24">
        <Mascot controllerRef={mascotRef} face={EMPTY_FACE} reactToDrops={false} />
      </div>
      <div className="flex max-w-[340px] flex-col gap-1">
        <p className="text-[15px] font-semibold text-text">{TOOLS_TEXTS.emptyTitle}</p>
        <p className="text-sm text-muted">
          {TOOLS_TEXTS.emptyIdea}
          <button
            type="button"
            onClick={() => void openIssues().catch(() => undefined)}
            className="cursor-pointer font-semibold text-lilac underline underline-offset-2 hover:text-lilac-soft"
          >
            {TOOLS_TEXTS.emptyLink}
          </button>
          {TOOLS_TEXTS.emptyEnd}
        </p>
      </div>
    </div>
  );
};
