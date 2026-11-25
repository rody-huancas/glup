import { MAIN_WINDOW_TEXTS } from '@/modules/main-window/constants/mainWindow';
import type { PanelControlsProps } from '@/modules/main-window/interfaces/mainPanel';
import { IconButton } from '@/shared/components/IconButton';
import { ChevronUpIcon } from '@/shared/icons/ChevronUpIcon';
import { PinIcon } from '@/shared/icons/PinIcon';

const BUTTON_CLASS = 'size-8 rounded-full text-text/80 hover:bg-white/10 hover:text-text';

// Fijar and Recoger on their own dark pill with a light edge, so they read over anything (the mint card
// of Inicio too).
export const PanelControls = ({ pinned, onTogglePin, onCollapse }: PanelControlsProps) => (
  <div className="absolute top-3 right-3 z-10 flex items-center gap-0.5 rounded-full border border-island-edge-soft bg-chip p-0.5 backdrop-blur-sm">
    <IconButton icon={PinIcon} label={pinned ? MAIN_WINDOW_TEXTS.unpin : MAIN_WINDOW_TEXTS.pin} onClick={onTogglePin} active={pinned} className={BUTTON_CLASS} iconClass="size-4" />
    <IconButton icon={ChevronUpIcon} label={MAIN_WINDOW_TEXTS.collapse} onClick={onCollapse} className={BUTTON_CLASS} iconClass="size-4" />
  </div>
);
