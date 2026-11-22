import type { FileInfo } from '@/modules/actions/interfaces/fileInfo';
import { OrderRow } from '@/modules/pdf/components/OrderRow';
import { StepHeader } from '@/modules/pdf/components/StepHeader';
import { PDF_TEXTS } from '@/modules/pdf/constants/pdf';
import { useReorder } from '@/modules/pdf/hooks/useReorder';
import { Button } from '@/shared/components/Button';

interface MergeOrderStepProps {
  files   : FileInfo[];
  onMerge : (paths: string[]) => void;
  onBack  : () => void;
}

// Row height plus the gap between rows, for dragging.
const ROW_STEP = 62;

// "Ordena los archivos": the list scrolls inside if it does not fit.
export const MergeOrderStep = ({ files, onMerge, onBack }: MergeOrderStepProps) => {
  const order = useReorder(files.map(({ path, name, kind, pages }) => ({ path, name, kind, pages })), ROW_STEP);

  return (
    <div className="flex flex-col">
      <StepHeader title={PDF_TEXTS.orderTitle} onBack={onBack} />
      <ul className="scroll-thin mt-2.5 flex max-h-[128px] flex-col gap-1.5 overflow-y-auto pr-1">
        {order.items.map((item, index) => (
          <OrderRow
            key={item.path}
            item={item}
            index={index}
            count={order.items.length}
            dragging={order.dragging === index}
            offset={order.offset}
            onMove={order.move}
            onHandleDown={order.onHandleDown}
            onHandleMove={order.onHandleMove}
            onHandleUp={order.onHandleUp}
          />
        ))}
      </ul>
      <Button onClick={() => onMerge(order.items.map((item) => item.path))} className="mt-2.5 h-10">
        {PDF_TEXTS.mergeButton(order.items.length)}
      </Button>
    </div>
  );
};
