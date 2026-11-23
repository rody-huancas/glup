import { ACTIONS_TEXTS } from '@/modules/actions/constants/texts';
import type { ActionProgress } from '@/modules/actions/interfaces/actionReport';
import type { ActionsPhase } from '@/modules/actions/types/actionsPhase';

const PHASE_MESSAGES: Record<ActionsPhase, string | null> = {
  choosing         : null,
  formats          : null,
  order            : null,
  split            : null,
  reduce           : null,
  pages            : null,
  'image-format'   : null,
  'learn-model'    : null,
  'learning-model' : null,
  background       : null,
  protect          : null,
  unlock           : null,
  watermark        : null,
  numbering        : null,
  video            : null,
  working          : ACTIONS_TEXTS.working,
  learning         : ACTIONS_TEXTS.learning,
  result           : null,
};

// "Trabajando… 2 de 5" when there are several files.
export const getPhaseMessage = (phase: ActionsPhase, progress: ActionProgress | null = null): string | null => {
  if (phase === 'working' && progress && progress.total > 1) return ACTIONS_TEXTS.progress(progress.current, progress.total);
  return PHASE_MESSAGES[phase];
};

// const PHASE_MESSAGES: Record<ActionsPhase, string | null> = {
//   choosing : null,
//   working  : ACTIONS_TEXTS.working,
//   learning : ACTIONS_TEXTS.learning,
// };
//
// export const getPhaseMessage = (phase: ActionsPhase): string | null => PHASE_MESSAGES[phase];
