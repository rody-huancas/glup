import type { FileSelection } from '@/modules/actions/interfaces/fileSelection';
import { getFileIcon } from '@/modules/actions/utils/fileIcon';
import { getSelectionSummary } from '@/modules/actions/utils/summary';

interface FileChipProps {
  selection: FileSelection;
}

export const FileChip = ({ selection }: FileChipProps) => {
  const { label, size } = getSelectionSummary(selection);

  return (
    <div className="flex h-9 min-w-0 flex-1 items-center gap-2 rounded-control border border-line bg-raised px-2.5">
      <img src={getFileIcon(selection.type)} alt="" draggable={false} className="h-5 w-auto shrink-0" />
      <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-text">{label}</span>
      {size && <span className="shrink-0 text-xs text-muted">{size}</span>}
    </div>
  );
};
