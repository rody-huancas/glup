import { WindowButton } from '@/modules/main-window/components/WindowButton';
import { MAIN_WINDOW_TEXTS } from '@/modules/main-window/constants/mainWindow';
import { hideWindow, minimizeWindow } from '@/modules/main-window/utils/windowControls';
import { CloseIcon } from '@/shared/icons/CloseIcon';
import { MinimizeIcon } from '@/shared/icons/MinimizeIcon';

export const TitleBar = () => (
  <header data-tauri-drag-region className="flex h-10 shrink-0 items-center justify-end gap-1 px-2">
    <WindowButton icon={MinimizeIcon} label={MAIN_WINDOW_TEXTS.minimize} onClick={minimizeWindow} />
    <WindowButton icon={CloseIcon} label={MAIN_WINDOW_TEXTS.close} onClick={hideWindow} />
  </header>
);
