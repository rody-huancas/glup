import type { ActionDefinition } from '@/modules/actions/interfaces/actionDefinition';
import type { ActionId } from '@/modules/actions/types/actionId';
import { getActionButtonClass } from '@/modules/actions/utils/actionStyles';

interface ActionButtonProps {
  action   : ActionDefinition;
  disabled : boolean;
  onChoose : (actionId: ActionId) => void;
}

export const ActionButton = ({ action, disabled, onChoose }: ActionButtonProps) => (
  <button
    type="button"
    disabled={disabled}
    onClick={() => onChoose(action.id)}
    className={getActionButtonClass(action.primary)}
  >
    {action.label}
  </button>
);
