import { ScanThumb } from '@/modules/scan/components/ScanThumb';
import { SCAN_TEXTS } from '@/modules/scan/constants/texts';
import { useSheetDrag } from '@/modules/scan/hooks/useSheetDrag';
import type { ScanSheet } from '@/modules/scan/interfaces/scanSheet';

interface ScanThumbsProps {
  sheets   : ScanSheet[];
  current  : string | null;
  onChoose : (id: string) => void;
  onTurn   : (id: string, direction: 'left' | 'right') => void;
  onRemove : (id: string) => void;
  onMove   : (from: number, to: number) => void;
}

// Every sheet in the order of the PDF.
export const ScanThumbs = ({ sheets, current, onChoose, onTurn, onRemove, onMove }: ScanThumbsProps) => {
  const drag = useSheetDrag(onMove);

  return (
    <ol ref={drag.list} aria-label={SCAN_TEXTS.sheets} className="scroll-thin flex shrink-0 gap-3 overflow-x-auto border-t border-line px-4 pt-3 pb-2">
      {sheets.map((sheet, index) => (
        <ScanThumb
          key={sheet.id}
          sheet={sheet}
          index={index}
          current={sheet.id === current}
          dragging={drag.from === index}
          dropBefore={drag.from !== null && drag.target === index && drag.target !== drag.from && drag.target !== drag.from + 1}
          onChoose={() => onChoose(sheet.id)}
          onTurn={(direction) => onTurn(sheet.id, direction)}
          onRemove={() => onRemove(sheet.id)}
          onMoveKey={(step) => onMove(index, index + step)}
          onPointerDown={drag.onPointerDown(index)}
          onPointerMove={drag.onPointerMove}
          onPointerUp={drag.onPointerUp}
          takeClick={drag.takeClick}
        />
      ))}
    </ol>
  );
};
