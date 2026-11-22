import { ActionsPanel } from '@/modules/actions/components/ActionsPanel';
import { ActionsSkeleton } from '@/modules/actions/components/ActionsSkeleton';
import { HOME_TEXTS } from '@/modules/home/constants/home';
import type { HomeFiles } from '@/modules/home/interfaces/homeFiles';
import { Card } from '@/shared/components/Card';
import { ChevronLeftIcon } from '@/shared/icons/ChevronLeftIcon';

interface HomeActionsCardProps {
  files: HomeFiles;
}

export const HomeActionsCard = ({ files }: HomeActionsCardProps) => {
  if (!files.selection && !files.loading) return null;

  return (
    <section className="flex shrink-0 flex-col gap-2">
      <button
        type="button"
        onClick={files.close}
        className="flex w-fit cursor-pointer items-center gap-1 text-[13px] font-semibold text-lilac hover:text-lilac-soft"
      >
        <ChevronLeftIcon className="size-4" />
        {HOME_TEXTS.back}
      </button>
      <Card className="p-3.5">
        {files.selection ? (
          <ActionsPanel selection={files.selection} flow={files.flow} />
        ) : (
          files.loading && (
            <ActionsSkeleton pending={files.loading} slow={files.slow} location={files.saveLocation} onClose={files.close} />
          )
        )}
        {/* <ActionsPanel selection={files.selection} phase={files.phase} onChoose={files.choose} onClose={files.close} /> */}
      </Card>
    </section>
  );
};
