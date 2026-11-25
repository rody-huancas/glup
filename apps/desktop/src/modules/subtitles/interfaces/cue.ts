// One phrase on screen, in milliseconds from the start of the video (Cue in services/subtitles/cues.rs).
export interface Cue {
  start : number;
  end   : number;
  text  : string;
}
