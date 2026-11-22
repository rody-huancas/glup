import { ActionsGrid } from '@/modules/actions/components/ActionsGrid';
import { CloseButton } from '@/modules/actions/components/CloseButton';
import { ACTIONS_TEXTS } from '@/modules/actions/constants/texts';
import type { FileSelection } from '@/modules/actions/interfaces/fileSelection';
import type { ActionId } from '@/modules/actions/types/actionId';
import type { ActionsPhase } from '@/modules/actions/types/actionsPhase';
import { getFileIcon } from '@/modules/actions/utils/fileIcon';
import { getActionsTitle, getSelectionSummary } from '@/modules/actions/utils/summary';
import { FileChip } from '@/shared/components/FileChip';

interface ActionsPanelProps {
  selection : FileSelection;
  phase     : ActionsPhase;
  onChoose  : (actionId: ActionId) => void;
  onClose   : () => void;
}

export const ActionsPanel = ({ selection, phase, onChoose, onClose }: ActionsPanelProps) => {
  const { label, size } = getSelectionSummary(selection);

  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-1.5">
        <FileChip icon={getFileIcon(selection.type)} label={label} size={size} />
        <CloseButton onClose={onClose} />
      </div>
      <h2 className="mt-3 text-[15px] font-semibold text-text">{getActionsTitle(selection)}</h2>
      <div className="mt-2.5">
        <ActionsGrid actions={selection.actions} phase={phase} onChoose={onChoose} />
      </div>
      <p className="mt-2.5 text-[11px] text-muted">{ACTIONS_TEXTS.savedNextTo}</p>
    </div>
  );
};
