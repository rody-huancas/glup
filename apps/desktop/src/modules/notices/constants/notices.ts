import type { Face } from '@/modules/mascot/interfaces/face';

// A task shorter than this with the panel open: the person is surely still looking, only the toast.
export const SHORT_TASK_MS = 3000;

// The toast goes away on its own after this long.
export const TOAST_TIME = 5000;

export const TOAST_FACES: Record<'happy' | 'confused', Partial<Face>> = {
  happy    : { mouth: 'smile' },
  confused : { mouth: 'wavy' },
};

export const NOTICE_TEXTS = {
  see   : 'Ver',
  undo  : 'Deshacer',
  close : 'Cerrar aviso',
};
