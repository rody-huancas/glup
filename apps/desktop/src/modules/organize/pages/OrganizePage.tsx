import { Mascot } from '@/modules/mascot/components/Mascot';
import { OrganizeEditor } from '@/modules/organize/components/OrganizeEditor';
import { SKELETON_TILES } from '@/modules/organize/constants/grid';
import { CONFUSED_FACE } from '@/modules/organize/constants/screen';
import { ORGANIZE_TEXTS } from '@/modules/organize/constants/texts';
import { usePdfPageTotal } from '@/modules/organize/hooks/usePdfPageTotal';
import type { OrganizeTarget } from '@/modules/organize/interfaces/organizeTarget';
import type { SaveDestination } from '@/modules/settings/interfaces/appSettings';
import { Button } from '@/shared/components/Button';
import { Skeleton } from '@/shared/components/Skeleton';
import { useKeyDown } from '@/shared/hooks/useKeyDown';

interface OrganizePageProps {
  target      : OrganizeTarget;
  destination : SaveDestination;
  onExit      : () => void;
}

// Takes the whole panel, like "Firmar". The editor opens once pdf.js knows how many pages there are.
export const OrganizePage = ({ target, destination, onExit }: OrganizePageProps) => {
  const { total, failed } = usePdfPageTotal(target.path);

  // Until the editor is on screen, Esc only leaves (there is nothing to lose yet).
  useKeyDown({ key: 'Escape', enabled: total === null, handler: onExit });

  if (total !== null && !failed) return <OrganizeEditor target={target} total={total} destination={destination} onExit={onExit} />;

  return (
    <div className="relative flex h-full w-full p-3">
      <div className="flex min-w-0 flex-1 flex-col rounded-[18px] border border-line bg-surface p-5">
        <h1 className="text-lg font-bold tracking-[-0.01em] text-text">{ORGANIZE_TEXTS.title}</h1>
        {failed ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4">
            <div className="w-24">
              <Mascot face={CONFUSED_FACE} reactToDrops={false} />
            </div>
            <p className="text-[15px] font-semibold text-text">{ORGANIZE_TEXTS.unreadable}</p>
            <Button variant="secondary" onClick={onExit} className="h-10">
              {ORGANIZE_TEXTS.exit}
            </Button>
          </div>
        ) : (
          <div className="mt-[72px] grid grid-cols-6 gap-3">
            {Array.from({ length: SKELETON_TILES }, (_, index) => <Skeleton key={index} className="aspect-[4/5] w-full rounded-control" />)}
          </div>
        )}
      </div>
    </div>
  );
};
