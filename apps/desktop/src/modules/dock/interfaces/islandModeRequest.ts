import type { IslandRest } from '@/modules/dock/types/islandRest';

// "Cómo se muestra" as Rust saves it: what is not sent stays as it was.
export interface IslandModeRequest {
  rest?        : IslandRest;
  revealDelay? : number;
  introSeen?   : boolean;
}
