import { CloseButton } from '@/modules/actions/components/CloseButton';
import { ACTIONS_TEXTS } from '@/modules/actions/constants/texts';
import type { PendingSelection } from '@/modules/actions/interfaces/pendingSelection';
import { getSelectionIcon } from '@/modules/actions/utils/fileIcon';
import { SaveLocationPicker } from '@/modules/settings/components/SaveLocationPicker';
import type { SaveLocation } from '@/modules/settings/interfaces/saveLocation';
import { Skeleton } from '@/shared/components/Skeleton';
import { FileIcon } from '@/shared/icons/FileIcon';

interface ActionsSkeletonProps {
  pending  : PendingSelection;
  slow     : boolean;
  location : SaveLocation;
  onClose  : () => void;
}

// Same layout and sizes as the actions panel, so nothing jumps when the real data arrives.
export const ActionsSkeleton = ({ pending, slow, location, onClose }: ActionsSkeletonProps) => {
  const icon = pending.type ? getSelectionIcon(pending.type) : null;

  return (
    <div className="flex flex-col" aria-busy>
      <div className="flex items-center gap-1.5">
        <div className="flex h-9 min-w-0 flex-1 items-center gap-2 rounded-control border border-line bg-raised px-2.5">
          {icon ? (
            <img src={icon} alt="" draggable={false} className="h-5 w-auto shrink-0" />
          ) : (
            <FileIcon className="size-5 text-muted" />
          )}
          <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-text">{pending.label}</span>
          <Skeleton className="h-3 w-14 shrink-0" />
        </div>
        <CloseButton onClose={onClose} />
      </div>
      <div className="mt-2.5">
        <SaveLocationPicker location={location} disabled />
      </div>
      <h2 className="mt-3 text-[15px] font-semibold text-text">
        {pending.paths.length > 1 ? ACTIONS_TEXTS.titleMultiple : ACTIONS_TEXTS.titleSingle}
      </h2>
      <div className="mt-2.5 grid grid-cols-3 gap-2">
        {Array.from({ length: pending.actionCount }, (_, index) => (
          <Skeleton key={index} className="h-10 rounded-control" />
        ))}
      </div>
      {slow && <p className="mt-2.5 text-[11px] text-muted">{ACTIONS_TEXTS.loadingSlow}</p>}
    </div>
  );
};
