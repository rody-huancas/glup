import { createRef } from 'react';
import type { LimbElements, MascotElements } from '@/modules/mascot/interfaces/elements';

const createLimb = (): LimbElements => ({ sway: createRef(), move: createRef() });

export const createMascotElements = (): MascotElements => ({
  breath   : createRef(),
  act      : createRef(),
  eyes     : createRef(),
  eyeLeft  : { wrapper: createRef(), open: createRef() },
  eyeRight : { wrapper: createRef(), open: createRef() },
  mouths   : {
    smile : createRef(),
    open  : createRef(),
    o     : createRef(),
    line  : createRef(),
    wavy  : createRef(),
  },
  files: {
    pdf   : createRef(),
    image : createRef(),
  },
  limbs: {
    'arm-left'   : createLimb(),
    'arm-right'  : createLimb(),
    'arm-wave'   : createLimb(),
    'foot-left'  : createLimb(),
    'foot-right' : createLimb(),
  },
});
