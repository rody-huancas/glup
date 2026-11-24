import { useAppIcon } from '@/modules/performance/hooks/useAppIcon';
import { FileIcon } from '@/shared/icons/FileIcon';

interface AppIconProps {
  path: string | null;
}

// The program's own icon, or a plain one while it loads or when it has none.
export const AppIcon = ({ path }: AppIconProps) => {
  const url = useAppIcon(path);

  return url ? <img src={url} alt="" draggable={false} className="size-7 shrink-0 object-contain" /> : <FileIcon className="size-7 shrink-0 text-muted" />;
};
