// What Rust read of the file (open_media).
export interface MediaInfo {
  duration   : number;
  hasVideo   : boolean;
  width      : number;
  height     : number;
  hasAudio   : boolean;
  audioCodec : string | null;
  videoCodec : string | null;
  bitrate    : number | null;
}

export interface OpenedMedia {
  info : MediaInfo;
  // Where the player reads it; null when the webview cannot play it (a preview is made).
  url  : string | null;
}
