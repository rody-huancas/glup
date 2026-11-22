import { createRef } from 'react';
import type { MascotElements } from '@/modules/mascot/interfaces/elements';

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
});
