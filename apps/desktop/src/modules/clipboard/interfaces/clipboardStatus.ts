export interface ClipboardStatus {
  // Windows, with its protection to encrypt what is kept.
  supported   : boolean;
  enabled     : boolean;
  pausedUntil : string | null;
  count       : number;
  limit       : number;
  // Programs whose copies are never kept ("banco.exe").
  excluded    : string[];
}
