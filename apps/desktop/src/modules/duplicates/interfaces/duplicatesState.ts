import type { DuplicatesScan } from '@/modules/duplicates/interfaces/duplicatesScan';
import type { RemoveReport } from '@/modules/duplicates/interfaces/removeReport';
import type { DuplicatesPhase } from '@/modules/duplicates/types/duplicatesPhase';

export interface DuplicatesState {
  phase    : DuplicatesPhase;
  // Where to look (null until Rust says the defaults).
  folders  : string[] | null;
  minSize  : number;
  similar  : boolean;
  scan     : DuplicatesScan | null;
  // Paths marked to quit.
  marked   : Set<string>;
  taskId   : string | null;
  report   : RemoveReport | null;
  // A folder that could not be added, said once.
  problem  : string | null;
}
