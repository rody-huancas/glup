// A file found by the scan; copies of the same file share a group (repeated files).
export interface CleanupItem {
  path     : string;
  size     : number;
  // Milliseconds since 1970.
  modified : number;
  group    : number | null;
}
