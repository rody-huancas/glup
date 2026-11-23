import { getFileIcon } from '@/modules/actions/utils/fileIcon';
import type { ToolIcon as ToolIconName } from '@/modules/tools/types/toolIcon';
import { CleanupIcon } from '@/shared/icons/CleanupIcon';
import { TextIcon } from '@/shared/icons/TextIcon';
import { VideoIcon } from '@/shared/icons/VideoIcon';
import { ZipIcon } from '@/shared/icons/ZipIcon';

interface ToolIconProps {
  icon: ToolIconName;
}

const STROKE_ICONS = { zip: ZipIcon, video: VideoIcon, text: TextIcon, cleanup: CleanupIcon };

// PDFs and images use Glup's file artwork; the rest a stroke icon in a tile of the same size.
export const ToolIcon = ({ icon }: ToolIconProps) => {
  if (icon === 'pdf' || icon === 'image') {
    return <img src={getFileIcon(icon)} alt="" draggable={false} className="size-9 shrink-0 object-contain" />;
  }

  const Icon = STROKE_ICONS[icon];
  // const Icon = icon === 'zip' ? ZipIcon : icon === 'video' ? VideoIcon : CleanupIcon;
  // const Icon = icon === 'zip' ? ZipIcon : CleanupIcon;

  return (
    <span className="flex size-9 shrink-0 items-center justify-center rounded-control bg-bg text-lilac">
      <Icon />
    </span>
  );
};
