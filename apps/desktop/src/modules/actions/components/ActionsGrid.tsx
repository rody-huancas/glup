import { ActionButton } from '@/modules/actions/components/ActionButton';
import { ActionsStatus } from '@/modules/actions/components/ActionsStatus';
import type { ActionDefinition } from '@/modules/actions/interfaces/actionDefinition';
import type { ActionId } from '@/modules/actions/types/actionId';
import type { ActionsPhase } from '@/modules/actions/types/actionsPhase';
import { getPhaseMessage } from '@/modules/actions/utils/phase';

interface ActionsGridProps {
  actions  : ActionDefinition[];
  phase    : ActionsPhase;
  onChoose : (actionId: ActionId) => void;
}

// The grid keeps its size while a status replaces it, so the panel height stays stable.
export const ActionsGrid = ({ actions, phase, onChoose }: ActionsGridProps) => {
  const message = getPhaseMessage(phase);

  return (
    <div className="relative">
      <div className={`grid grid-cols-2 gap-2 ${message ? 'invisible' : ''}`}>
        {actions.map((action) => (
          <ActionButton key={action.id} action={action} disabled={message !== null} onChoose={onChoose} />
        ))}
      </div>
      {message && <ActionsStatus message={message} />}
    </div>
  );
};
