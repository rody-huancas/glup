import { revealFile } from '@/modules/actions/services/files';
import { SPACE_TEXTS } from '@/modules/space/constants/texts';
import type { SpaceItem } from '@/modules/space/interfaces/spaceView';
import { Button } from '@/shared/components/Button';

interface ItemActionsProps {
  item    : SpaceItem;
  onTrash : () => void;
}

// «Abrir carpeta», and «Mandar a la papelera» only when it may go; otherwise, in one line, why not.
export const ItemActions = ({ item, onTrash }: ItemActionsProps) => (
  <div className="flex flex-wrap items-center gap-2">
    <Button variant="secondary" onClick={() => void revealFile(item.path)} className="h-8 px-3 text-[12px]">{SPACE_TEXTS.open}</Button>
    {item.blocked ? (
      <p className="max-w-64 text-[12px] text-muted">{item.blocked}</p>
    ) : (
      <Button variant="danger" onClick={onTrash} className="h-8 px-3 text-[12px]">{SPACE_TEXTS.trash}</Button>
    )}
  </div>
);
