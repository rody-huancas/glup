import type { AutoToolId } from '@/modules/auto-folders/types/autoToolId';
import type { FileGroup } from '@/modules/auto-folders/types/fileGroup';
import type { OriginalChoice } from '@/modules/auto-folders/types/originalChoice';
import type { SaveMode } from '@/modules/settings/types/saveMode';

// The rule while it is being written on the screen (texts as typed).
export interface RuleDraft {
  id         : string | null;
  name       : string;
  folder     : string;
  group      : FileGroup;
  // As typed: "psd, dwg".
  extensions : string;
  // As typed; empty: any size.
  minMb      : string;
  tool       : AutoToolId;
  // The option of the action (a format, a level), or null when it has none.
  choice     : string | null;
  original   : OriginalChoice;
  saveMode   : SaveMode;
  saveFolder : string | null;
  enabled    : boolean;
}
