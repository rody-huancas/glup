// A signature PNG as Rust stores it; kept ones are listed again next time.
export interface SignatureFile {
  id   : string;
  path : string;
  kept : boolean;
}

// Ready to show and place: an object URL for the preview and its proportions.
export interface Signature extends SignatureFile {
  url    : string;
  aspect : number;
}
