import type { ResultTone } from '@/modules/actions/types/resultTone';
import { IDLE_STATE } from '@/modules/mascot/constants/mascot';
import type { MascotState } from '@/modules/mascot/types/mascotState';

// Glup's reaction to the result: happy when done, confused if something failed, calm when nothing was needed.
export const RESULT_MOODS: Record<ResultTone, MascotState> = {
  success : { type: 'happy' },
  partial : { type: 'confused' },
  failed  : { type: 'confused' },
  calm    : IDLE_STATE,
};
