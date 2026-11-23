import type { Face } from '@/modules/mascot/interfaces/face';
import type { MascotStateType } from '@/modules/mascot/types/mascotState';

export const MAIN_WINDOW_TEXTS = {
  name         : 'Glup',
  pin          : 'Fijar',
  unpin        : 'Soltar',
  collapse     : 'Recoger',
  privacyTitle : 'Todo se queda en tu PC',
  privacyText  : 'Glup no sube tus archivos a internet.',
  comingSoon   : 'Esta parte la estoy preparando.',
};

export const DEFAULT_STATUS = 'Con hambre de archivos';

export const MASCOT_STATUS: Partial<Record<MascotStateType, string>> = {
  working : 'Trabajando…',
  happy   : '¡Listo!',
};

export const COMING_SOON_FACE: Partial<Face> = { mouth: 'wavy' };
