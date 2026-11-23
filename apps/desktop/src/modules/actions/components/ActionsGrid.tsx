import { ActionButton } from '@/modules/actions/components/ActionButton';
import { ActionsStatus } from '@/modules/actions/components/ActionsStatus';
import type { ActionDefinition } from '@/modules/actions/interfaces/actionDefinition';
import type { ActionId } from '@/modules/actions/types/actionId';

interface ActionsGridProps {
  actions  : ActionDefinition[];
  message  : string | null;
  onChoose : (actionId: ActionId) => void;
}

// The grid keeps its size while a status replaces it, so the panel height stays stable.
export const ActionsGrid = ({ actions, message, onChoose }: ActionsGridProps) => (
  <div className="relative">
    <div className={`grid grid-cols-3 gap-2 ${message ? 'invisible' : ''}`}>
      {actions.map((action) => (
        <ActionButton key={action.id} action={action} disabled={message !== null} onChoose={onChoose} />
      ))}
    </div>
    {message && <ActionsStatus message={message} />}
  </div>
);
