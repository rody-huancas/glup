import { formatFileSize } from '@/modules/actions/utils/fileSize';
import type { SpaceItem } from '@/modules/space/interfaces/spaceView';

interface SpaceCrumbsProps {
  crumbs    : SpaceItem[];
  // How the top is called («Tu carpeta», a disk).
  rootLabel : string;
  onEnter   : (item: SpaceItem) => void;
}

// «Tu carpeta › Desktop · 36,1 GB»: every step back is a button; the last one says what it takes.
export const SpaceCrumbs = ({ crumbs, rootLabel, onEnter }: SpaceCrumbsProps) => (
  <nav aria-label="Ruta" className="flex min-w-0 items-center gap-1 overflow-hidden text-[13px]">
    {crumbs.map((crumb, index) => {
      const name = index === 0 ? rootLabel : crumb.name;
      return (
        <span key={crumb.id} className="flex min-w-0 shrink items-center gap-1">
          {index > 0 && <span aria-hidden className="text-muted">›</span>}
          {index === crumbs.length - 1 ? (
            <span aria-current="page" className="truncate font-semibold text-text">{name} · {formatFileSize(crumb.size)}</span>
          ) : (
            <button type="button" onClick={() => onEnter(crumb)} className="cursor-pointer truncate text-fam-pc outline-none hover:text-text focus-visible:ring-2 focus-visible:ring-fam-pc">{name}</button>
          )}
        </span>
      );
    })}
  </nav>
);
