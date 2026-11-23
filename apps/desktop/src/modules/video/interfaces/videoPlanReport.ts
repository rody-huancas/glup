// How one video would come out with the option chosen, worked out by Rust before starting.
export interface VideoPlanReport {
  path : string;
  // Null when FFmpeg could not read it.
  info : {
    duration : number;
    width    : number;
    height   : number;
    hasAudio : boolean;
  } | null;
  plan : {
    width    : number;
    height   : number;
    estimate : number;
    tooLong  : boolean;
    budget   : number | null;
  } | null;
}
