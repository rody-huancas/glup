import type { RuleFilter } from '@/modules/auto-folders/interfaces/ruleFilter';
import type { AutoToolId } from '@/modules/auto-folders/types/autoToolId';
import type { OriginalChoice } from '@/modules/auto-folders/types/originalChoice';
import type { SaveMode } from '@/modules/settings/types/saveMode';

// A rule as the screen sends it to Rust (RuleInput).
export interface RuleInput {
  id          : string | null;
  name        : string;
  folder      : string;
  filter      : RuleFilter;
  action      : { tool: AutoToolId; options: Record<string, unknown> };
  original    : OriginalChoice;
  destination : { mode: SaveMode; folder: string | null };
  enabled     : boolean;
}
