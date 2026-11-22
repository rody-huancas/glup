import type { MouthKind } from '@/modules/mascot/types/mouthKind';

const CHEW_MOUTHS: MouthKind[] = ['line', 'o'];

// Glup chews while the file info arrives: the mouth alternates and each bite squashes it a little.
export const CHEWING = {
  interval : 180,
  mouths   : CHEW_MOUTHS,
  squash   : { scaleX: 1.04, scaleY: 0.94, duration: 0.16, ease: 'power2.out', origin: '50% 92%' },
};
