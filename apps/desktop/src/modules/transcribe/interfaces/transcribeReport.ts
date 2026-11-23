// What Rust answers once every file was listened to (services/transcribe/mod.rs).
export interface TranscribeReport {
  text      : string;
  subtitles : string;
  seconds   : number;
  cancelled : boolean;
  entryId   : string | null;
}
