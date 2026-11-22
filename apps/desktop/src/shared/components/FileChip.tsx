import { FileIcon } from '@/shared/icons/FileIcon';

interface FileChipProps {
  // null shows a generic file icon (mixed selections).
  icon  : string | null;
  label : string;
  size? : string | null;
}

export const FileChip = ({ icon, label, size }: FileChipProps) => (
  <div className="flex h-9 min-w-0 flex-1 items-center gap-2 rounded-control border border-line bg-raised px-2.5">
    {icon ? (
      <img src={icon} alt="" draggable={false} className="h-5 w-auto shrink-0" />
    ) : (
      <FileIcon className="size-5 text-muted" />
    )}
    <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-text">{label}</span>
    {size && <span className="shrink-0 text-xs text-muted">{size}</span>}
  </div>
);
