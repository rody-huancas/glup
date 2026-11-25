import type { RuleInput } from '@/modules/auto-folders/interfaces/ruleInput';

// A saved rule with what it did and what it waits for (RuleView in Rust).
export interface AutoRule extends Omit<RuleInput, 'id'> {
  id         : string;
  processed  : number;
  lastRun    : number | null;
  seenUntil  : number;
  // The download it needs before going on (a learnable: "video", "background"…).
  needs      : string | null;
  // Files that arrived while it waited for it.
  held       : string[];
  folderName : string;
  // Files in the queue now.
  waiting    : number;
  // Arrived with Glup closed, waiting for «¿Los hago?».
  asking     : number | null;
}
