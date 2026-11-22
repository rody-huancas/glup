import { ActionsGrid } from '@/modules/actions/components/ActionsGrid';
import { CloseButton } from '@/modules/actions/components/CloseButton';
import { FileChip } from '@/modules/actions/components/FileChip';
import { ACTIONS_TEXTS } from '@/modules/actions/constants/texts';
import type { FileSelection } from '@/modules/actions/interfaces/fileSelection';
import type { ActionId } from '@/modules/actions/types/actionId';
import type { ActionsPhase } from '@/modules/actions/types/actionsPhase';
import { getActionsTitle } from '@/modules/actions/utils/summary';

interface ActionsPanelProps {
  selection : FileSelection;
  phase     : ActionsPhase;
  onChoose  : (actionId: ActionId) => void;
  onClose   : () => void;
}

export const ActionsPanel = ({ selection, phase, onChoose, onClose }: ActionsPanelProps) => (
  <div className="flex flex-col">
    <div className="flex items-center gap-1.5">
      <FileChip selection={selection} />
      <CloseButton onClose={onClose} />
    </div>
    <h2 className="mt-3 text-[15px] font-semibold text-text">{getActionsTitle(selection)}</h2>
    <div className="mt-2.5">
      <ActionsGrid actions={selection.actions} phase={phase} onChoose={onChoose} />
    </div>
    <p className="mt-2.5 text-[11px] text-muted">{ACTIONS_TEXTS.savedNextTo}</p>
  </div>
);
