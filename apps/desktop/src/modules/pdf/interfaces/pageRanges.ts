export type PageRangesResult =
  | { pages: number[]; error: null }
  | { pages: null; error: string };
