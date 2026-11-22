import { DEFAULT_STATUS, MASCOT_STATUS } from '@/modules/main-window/constants/mainWindow';
import type { MascotState } from '@/modules/mascot/types/mascotState';

export const getMascotStatus = (state: MascotState): string => MASCOT_STATUS[state.type] ?? DEFAULT_STATUS;
