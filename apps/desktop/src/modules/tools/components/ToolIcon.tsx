import type { ComponentType } from 'react';
import { FAMILY_STYLES } from '@/modules/families/constants/families';
import type { FamilyId } from '@/modules/families/types/familyId';
import type { ToolIcon as ToolIconName } from '@/modules/tools/types/toolIcon';
import { AudioTextIcon } from '@/shared/icons/AudioTextIcon';
import { CleanupIcon } from '@/shared/icons/CleanupIcon';
import { ClipboardIcon } from '@/shared/icons/ClipboardIcon';
import { CompressIcon } from '@/shared/icons/CompressIcon';
import { ConvertIcon } from '@/shared/icons/ConvertIcon';
import { FolderIcon } from '@/shared/icons/FolderIcon';
import { GaugeIcon } from '@/shared/icons/GaugeIcon';
import { IdPhotoIcon } from '@/shared/icons/IdPhotoIcon';
import { LockIcon } from '@/shared/icons/LockIcon';
import { MergeIcon } from '@/shared/icons/MergeIcon';
import { PageNumbersIcon } from '@/shared/icons/PageNumbersIcon';
import { PagesIcon } from '@/shared/icons/PagesIcon';
import { PdfImagesIcon } from '@/shared/icons/PdfImagesIcon';
import { PhoneIcon } from '@/shared/icons/PhoneIcon';
import { RemoveBackgroundIcon } from '@/shared/icons/RemoveBackgroundIcon';
import { ScreenTextIcon } from '@/shared/icons/ScreenTextIcon';
import { SignIcon } from '@/shared/icons/SignIcon';
import { SplitIcon } from '@/shared/icons/SplitIcon';
import { TextIcon } from '@/shared/icons/TextIcon';
import { ToImagesIcon } from '@/shared/icons/ToImagesIcon';
import { ToPdfIcon } from '@/shared/icons/ToPdfIcon';
import { UnlockIcon } from '@/shared/icons/UnlockIcon';
import { WatermarkIcon } from '@/shared/icons/WatermarkIcon';
import { ZipIcon } from '@/shared/icons/ZipIcon';
import type { IconProps } from '@/shared/interfaces/icon';
import { cx } from '@/shared/utils/classNames';

interface ToolIconProps {
  icon   : ToolIconName;
  family : FamilyId;
}

// The names tools.json uses, with their drawing (all of the app's stroke set).
const STROKE_ICONS: Record<ToolIconName, ComponentType<IconProps>> = {
  'merge'             : MergeIcon,
  'split'             : SplitIcon,
  'organize-pages'    : PagesIcon,
  'lock'              : LockIcon,
  'unlock'            : UnlockIcon,
  'watermark'         : WatermarkIcon,
  'page-numbers'      : PageNumbersIcon,
  'pdf-images'        : PdfImagesIcon,
  'compress'          : CompressIcon,
  'sign'              : SignIcon,
  'to-images'         : ToImagesIcon,
  'convert'           : ConvertIcon,
  'iphone'            : PhoneIcon,
  'remove-background' : RemoveBackgroundIcon,
  'id-photo'          : IdPhotoIcon,
  'to-pdf'            : ToPdfIcon,
  'text'              : TextIcon,
  'screen-text'       : ScreenTextIcon,
  'audio-text'        : AudioTextIcon,
  'zip'               : ZipIcon,
  'clipboard'         : ClipboardIcon,
  'cleanup'           : CleanupIcon,
  'folder-sort'       : FolderIcon,
  'performance'       : GaugeIcon,
};

// A tool's own stroke icon in the family's color, on its dark fill.
export const ToolIcon = ({ icon, family }: ToolIconProps) => {
  const Icon  = STROKE_ICONS[icon];
  const style = FAMILY_STYLES[family];

  return (
    <span className={cx('flex size-9 shrink-0 items-center justify-center rounded-control', style.dark, style.text)}>
      <Icon />
    </span>
  );
};
