import type { RenameRule, RenameRuleKind } from '@/modules/rename/interfaces/renameRule';

// Each rule starts with something that already does what it says.
export const newRule = (kind: RenameRuleKind): RenameRule => {
  switch (kind) {
    case 'number'      : return { kind, text: 'Foto {n}', digits: 3, start: 1, step: 1 };
    case 'replace'     : return { kind, find: '', with: '', caseSensitive: false };
    case 'add'         : return { kind, text: '', side: 'end' };
    case 'removeChars' : return { kind, chars: '_' };
    case 'removeRange' : return { kind, from: 1, count: 1, fromEnd: false };
    case 'case'        : return { kind, case: 'sentence' };
    case 'date'        : return { kind, format: 'YYYY-MM-DD', side: 'start', separator: ' ' };
  }
};

// One item of a list moved one place (or to another index), the others kept in order.
export const moveItem = <T,>(list: T[], from: number, to: number): T[] => {
  if (from === to || from < 0 || to < 0 || from >= list.length || to >= list.length) return list;
  const next   = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
};

export interface Change {
  same    : string;
  changed : string;
  tail    : string;
}

// What changes between two names: the part they share at the start, the different middle, the shared end.
export const changeOf = (before: string, after: string): Change => {
  let start = 0;
  while (start < before.length && start < after.length && before[start] === after[start]) start += 1;
  let end = 0;
  while (end < before.length - start && end < after.length - start && before[before.length - 1 - end] === after[after.length - 1 - end]) end += 1;
  return { same: after.slice(0, start), changed: after.slice(start, after.length - end), tail: after.slice(after.length - end) };
};
