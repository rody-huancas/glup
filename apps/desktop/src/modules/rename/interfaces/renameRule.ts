// Rule in services/rename/rules.rs, in the order they apply.
export type RenameSide = 'start' | 'end';
export type RenameCase = 'lower' | 'upper' | 'sentence';

export type RenameRule =
  | { kind: 'number'; text: string; digits: number; start: number; step: number }
  | { kind: 'replace'; find: string; with: string; caseSensitive: boolean }
  | { kind: 'add'; text: string; side: RenameSide }
  | { kind: 'removeChars'; chars: string }
  | { kind: 'removeRange'; from: number; count: number; fromEnd: boolean }
  | { kind: 'case'; case: RenameCase }
  | { kind: 'date'; format: string; side: RenameSide; separator: string };

export type RenameRuleKind = RenameRule['kind'];
export type RenameOrder = 'name' | 'date' | 'given';

export interface RenameRow {
  path    : string;
  old     : string;
  new     : string;
  changed : boolean;
  problem : string | null;
  reason  : string | null;
}

export interface ApplyReport {
  renamed : number;
  failed  : string[];
  undo    : string | null;
  message : string;
}
