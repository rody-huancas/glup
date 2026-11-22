import type { ActionDefinition } from '@/modules/actions/interfaces/actionDefinition';
import type { ActionId } from '@/modules/actions/types/actionId';
import { Button } from '@/shared/components/Button';

interface ActionButtonProps {
  action   : ActionDefinition;
  disabled : boolean;
  onChoose : (actionId: ActionId) => void;
}

export const ActionButton = ({ action, disabled, onChoose }: ActionButtonProps) => (
  <Button
    variant={action.primary ? 'primary' : 'secondary'}
    disabled={disabled}
    onClick={() => onChoose(action.id)}
    className="h-10 px-3"
  >
    {action.label}
  </Button>
);
