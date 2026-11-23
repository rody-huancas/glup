// What Rust answers once the text is put together (services/text/mod.rs).
export interface TextReport {
  text    : string;
  // Pages and images read, and how many of them had text.
  pages   : number;
  written : number;
  // The history line, to point it at the .txt if it is saved.
  entryId : string | null;
}
