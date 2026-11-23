// The text of one file, page by page (an image is one page with no number). Rust puts them together.
export interface FileText {
  name  : string;
  pages : { page: number | null; text: string }[];
}
