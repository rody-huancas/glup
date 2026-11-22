import { getCurrentWindow } from '@tauri-apps/api/window';
import { MAIN_WINDOW_LABEL } from '@/shared/constants/windows';

export const isMainWindow = (): boolean => getCurrentWindow().label === MAIN_WINDOW_LABEL;
