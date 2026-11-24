// "Cómo se muestra" as Rust saves it: what is not sent stays as it was.
export interface IslandModeRequest {
  hidden?      : boolean;
  revealDelay? : number;
  introSeen?   : boolean;
}
