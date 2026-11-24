// A program that starts with Windows (services/performance/startup.rs).
export interface StartupEntry {
  id        : string;
  name      : string;
  path      : string | null;
  command   : string;
  enabled   : boolean;
  canChange : boolean;
  // For every user of the PC.
  everyone  : boolean;
}
