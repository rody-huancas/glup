import { ACTIONS_TEXTS } from '@/modules/actions/constants/texts';
import type { ActionsPhase } from '@/modules/actions/types/actionsPhase';

const PHASE_MESSAGES: Record<ActionsPhase, string | null> = {
  choosing : null,
  working  : ACTIONS_TEXTS.working,
  learning : ACTIONS_TEXTS.learning,
};

export const getPhaseMessage = (phase: ActionsPhase): string | null => PHASE_MESSAGES[phase];
