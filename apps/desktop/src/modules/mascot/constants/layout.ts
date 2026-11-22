import type { MascotLayout } from '@/modules/mascot/interfaces/layout';

export const MASCOT_LAYOUT: MascotLayout = {
  base: {
    width  : 1312,
    height : 1199,
  },
  pieces: {
    'eye-left'        : { x: 35.137, y: 40.24,  w: 11.28 },
    'eye-right'       : { x: 59.832, y: 40.256, w: 11.28 },
    'eye-happy-left'  : { x: 34.675, y: 42.712, w: 12.204 },
    'eye-happy-right' : { x: 59.346, y: 42.754, w: 12.253 },
    'mouth-smile'     : { x: 47.866, y: 51.535, w: 10.595 },
    'mouth-open'      : { x: 46.792, y: 50.918, w: 12.742 },
    'mouth-o'         : { x: 50.752, y: 51.278, w: 4.822 },
    'mouth-line'      : { x: 47.32,  y: 52.883, w: 11.686 },
    'mouth-wavy'      : { x: 47.056, y: 52.113, w: 12.214 },
    'file-pdf'        : { x: 46.082, y: 62.706, w: 14.085 },
    'file-image'      : { x: 44.676, y: 63.57,  w: 16.898 },
    'arm-left'        : { x: 8.537,  y: 62.135, w: 14.014, layer: 'behind-body', pivot: { x: 88, y: 35 } },
    'arm-right'       : { x: 77.439, y: 62.135, w: 13.97,  layer: 'behind-body', pivot: { x: 12, y: 35 } },
    'arm-wave'        : { x: 81.555, y: 43.369, w: 17.683, layer: 'behind-body', pivot: { x: 12, y: 88 } },
    'foot-left'       : { x: 26.829, y: 83.403, w: 16.902, layer: 'behind-body', pivot: { x: 50, y: 10 } },
    'foot-right'      : { x: 55.869, y: 83.403, w: 16.817, layer: 'behind-body', pivot: { x: 50, y: 10 } },
  },
};
