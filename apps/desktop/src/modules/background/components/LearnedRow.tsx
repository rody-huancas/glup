import { formatFileSize } from '@/modules/actions/utils/fileSize';
import { LEARNED_TEXTS } from '@/modules/background/constants/texts';
import type { Learned } from '@/modules/background/interfaces/learned';
import { Button } from '@/shared/components/Button';

interface LearnedRowProps {
  item : Learned;
}

// One thing learned, with how much it takes and "Borrar".
export const LearnedRow = ({ item }: LearnedRowProps) => (
  <div className="flex items-center justify-between gap-3">
    <div className="flex min-w-0 flex-col">
      <span className="text-[13px] font-semibold text-text">{item.learnable.texts.learned(formatFileSize(item.status?.size ?? 0))}</span>
      {item.failed && <span className="text-[11px] text-[#E58A9A]">{LEARNED_TEXTS.deleteError}</span>}
    </div>
    <Button variant="secondary" onClick={item.ask} disabled={item.deleting} className="h-9 shrink-0">
      {LEARNED_TEXTS.delete}
    </Button>
  </div>
);
