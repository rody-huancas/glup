import { FAMILY_STYLES } from '@/modules/families/constants/families';
import type { FamilyId } from '@/modules/families/types/familyId';
import type { ToolIcon as ToolIconName } from '@/modules/tools/types/toolIcon';
import { AudioTextIcon } from '@/shared/icons/AudioTextIcon';
import { CleanupIcon } from '@/shared/icons/CleanupIcon';
import { ClipboardIcon } from '@/shared/icons/ClipboardIcon';
import { FileIcon } from '@/shared/icons/FileIcon';
import { FolderIcon } from '@/shared/icons/FolderIcon';
import { GaugeIcon } from '@/shared/icons/GaugeIcon';
import { ImageIcon } from '@/shared/icons/ImageIcon';
import { ScreenTextIcon } from '@/shared/icons/ScreenTextIcon';
import { TextIcon } from '@/shared/icons/TextIcon';
import { VideoIcon } from '@/shared/icons/VideoIcon';
import { ZipIcon } from '@/shared/icons/ZipIcon';
import { cx } from '@/shared/utils/classNames';

interface ToolIconProps {
  icon   : ToolIconName;
  family : FamilyId;
}

const STROKE_ICONS = {
  'pdf'         : FileIcon,
  'image'       : ImageIcon,
  'zip'         : ZipIcon,
  'video'       : VideoIcon,
  'text'        : TextIcon,
  'screen-text' : ScreenTextIcon,
  'audio-text'  : AudioTextIcon,
  'cleanup'     : CleanupIcon,
  'clipboard'   : ClipboardIcon,
  'folder-sort' : FolderIcon,
  'performance' : GaugeIcon,
};

// A stroke icon in the family's color, on its dark fill.
export const ToolIcon = ({ icon, family }: ToolIconProps) => {
  const Icon  = STROKE_ICONS[icon];
  const style = FAMILY_STYLES[family];

  return (
    <span className={cx('flex size-9 shrink-0 items-center justify-center rounded-control', style.dark, style.text)}>
      <Icon />
    </span>
  );
};
