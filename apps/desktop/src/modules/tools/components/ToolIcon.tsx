import { FAMILY_STYLES } from '@/modules/families/constants/families';
import type { FamilyId } from '@/modules/families/types/familyId';
import type { ToolIcon as ToolIconName } from '@/modules/tools/types/toolIcon';
import { AudioTextIcon } from '@/shared/icons/AudioTextIcon';
import { CleanupIcon } from '@/shared/icons/CleanupIcon';
import { ClipboardIcon } from '@/shared/icons/ClipboardIcon';
import { CompressIcon } from '@/shared/icons/CompressIcon';
import { ConvertIcon } from '@/shared/icons/ConvertIcon';
import { DuplicatesIcon } from '@/shared/icons/DuplicatesIcon';
import { ExtractAudioIcon } from '@/shared/icons/ExtractAudioIcon';
import { FolderIcon } from '@/shared/icons/FolderIcon';
import { GaugeIcon } from '@/shared/icons/GaugeIcon';
import { GifIcon } from '@/shared/icons/GifIcon';
import { IdPhotoIcon } from '@/shared/icons/IdPhotoIcon';
import { LockIcon } from '@/shared/icons/LockIcon';
import { MergeIcon } from '@/shared/icons/MergeIcon';
import { PageNumbersIcon } from '@/shared/icons/PageNumbersIcon';
import { PagesIcon } from '@/shared/icons/PagesIcon';
import { PdfImagesIcon } from '@/shared/icons/PdfImagesIcon';
import { PhoneIcon } from '@/shared/icons/PhoneIcon';
import { PhotoMarkIcon } from '@/shared/icons/PhotoMarkIcon';
import { QrCreateIcon } from '@/shared/icons/QrCreateIcon';
import { QrReadIcon } from '@/shared/icons/QrReadIcon';
import { RemoveBackgroundIcon } from '@/shared/icons/RemoveBackgroundIcon';
import { ScanIcon } from '@/shared/icons/ScanIcon';
import { ScreenTextIcon } from '@/shared/icons/ScreenTextIcon';
import { SignIcon } from '@/shared/icons/SignIcon';
import { SocialSizeIcon } from '@/shared/icons/SocialSizeIcon';
import { SplitIcon } from '@/shared/icons/SplitIcon';
import { SubtitlesIcon } from '@/shared/icons/SubtitlesIcon';
import { TextIcon } from '@/shared/icons/TextIcon';
import { ToImagesIcon } from '@/shared/icons/ToImagesIcon';
import { ToPdfIcon } from '@/shared/icons/ToPdfIcon';
import { TrimIcon } from '@/shared/icons/TrimIcon';
import { UnlockIcon } from '@/shared/icons/UnlockIcon';
import { UpscaleIcon } from '@/shared/icons/UpscaleIcon';
import { WatermarkIcon } from '@/shared/icons/WatermarkIcon';
import { ZipIcon } from '@/shared/icons/ZipIcon';
import type { IconProps } from '@/shared/interfaces/icon';
import { cx } from '@/shared/utils/classNames';
import type { ComponentType } from 'react';

interface ToolIconProps {
  icon   : ToolIconName;
  family : FamilyId;
}

// The names tools.json uses, with their drawing (all of the app's stroke set).
const STROKE_ICONS: Record<ToolIconName, ComponentType<IconProps>> = {
  'merge'             : MergeIcon,
  'split'             : SplitIcon,
  'scan'              : ScanIcon,
  'extract-audio'     : ExtractAudioIcon,
  'trim'              : TrimIcon,
  'subtitles'         : SubtitlesIcon,
  'gif'               : GifIcon,
  'social-size'       : SocialSizeIcon,
  'photo-mark'        : PhotoMarkIcon,
  'upscale'           : UpscaleIcon,
  'qr-create'         : QrCreateIcon,
  'qr-read'           : QrReadIcon,
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
  'duplicates'        : DuplicatesIcon,
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
