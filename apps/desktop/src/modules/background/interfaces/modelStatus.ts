// What get_background_model answers.
export interface ModelStatus {
  installed : boolean;
  // The download size before installing; the size on disk after.
  size      : number;
  // Bytes of a download that was cut, to go on from there.
  partial   : number;
}
