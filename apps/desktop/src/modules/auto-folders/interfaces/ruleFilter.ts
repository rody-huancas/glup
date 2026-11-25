import type { FileGroup } from '@/modules/auto-folders/types/fileGroup';

export interface RuleFilter {
  group      : FileGroup;
  // Only with custom: "psd", "dwg"…
  extensions : string[];
  // «más grandes que X MB».
  minMb      : number | null;
}
