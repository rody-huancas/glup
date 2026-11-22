import { MAIN_WINDOW_TEXTS } from '@/modules/main-window/constants/mainWindow';
import type { PanelControlsProps } from '@/modules/main-window/interfaces/mainPanel';
import { IconButton } from '@/shared/components/IconButton';
import { ChevronUpIcon } from '@/shared/icons/ChevronUpIcon';
import { PinIcon } from '@/shared/icons/PinIcon';

export const PanelControls = ({ pinned, onTogglePin, onCollapse }: PanelControlsProps) => (
  <div className="absolute right-3 top-3 z-10 flex items-center gap-1">
    <IconButton
      icon={PinIcon}
      label={pinned ? MAIN_WINDOW_TEXTS.unpin : MAIN_WINDOW_TEXTS.pin}
      onClick={onTogglePin}
      active={pinned}
      className="size-9"
      iconClass="size-[18px]"
    />
    <IconButton
      icon={ChevronUpIcon}
      label={MAIN_WINDOW_TEXTS.collapse}
      onClick={onCollapse}
      className="size-9"
      iconClass="size-[18px]"
    />
  </div>
);
