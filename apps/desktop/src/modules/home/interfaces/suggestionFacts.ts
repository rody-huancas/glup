import type { LooseFiles } from '@/modules/home/interfaces/looseFiles';

// What the suggestions are made from: all of it read on this computer.
export interface SuggestionFacts {
  // The system disk (null while unknown).
  disk      : { free: number; total: number } | null;
  // What the last scan of Limpieza found to free, while it can still be cleaned (null without one).
  cleanup   : number | null;
  downloads : LooseFiles | null;
  dismissed : string[];
}
