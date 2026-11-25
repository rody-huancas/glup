import type { DuplicateGroup } from '@/modules/duplicates/interfaces/duplicateGroup';

// Only the clear extra copies come marked (in Descargas, or with the name of a copy), as Rust chose them.
// A group to «Revisar» and alike photos come with nothing marked.
export const defaultMarks = (groups: DuplicateGroup[]): Set<string> =>
  new Set(groups.flatMap((group) => (group.kind === 'same' ? group.quit.map((index) => group.files[index]?.path).filter((path): path is string => Boolean(path)) : [])));

interface ConfirmParams {
  count : number;
  bytes : number;
}

// «Quitar X» asks first when it is a lot.
export const CONFIRM_FROM = { count: 50, bytes: 1024 ** 3 };

export const needsConfirm = ({ count, bytes }: ConfirmParams): boolean => count > CONFIRM_FROM.count || bytes > CONFIRM_FROM.bytes;

const unmarkedIn = (group: DuplicateGroup, marked: Set<string>): number => group.files.filter((file) => !marked.has(file.path)).length;

interface ToggleParams {
  group  : DuplicateGroup;
  path   : string;
  marked : Set<string>;
}

// One copy in or out; the last copy left of a group can never be marked (null: refused).
export const toggleMark = ({ group, path, marked }: ToggleParams): Set<string> | null => {
  const next = new Set(marked);
  if (next.has(path)) {
    next.delete(path);
    return next;
  }
  if (unmarkedIn(group, marked) <= 1) return null;
  next.add(path);
  return next;
};

// «Que quede esta»: this copy stays, every other one of the group is marked.
export const keepOnly = ({ group, path, marked }: ToggleParams): Set<string> => {
  const next = new Set(marked);
  group.files.forEach((file) => (file.path === path ? next.delete(file.path) : next.add(file.path)));
  return next;
};

// The copy that stays in a group with exactly one unmarked, for the «Queda» mark.
export const keptPath = (group: DuplicateGroup, marked: Set<string>): string | null => {
  const left = group.files.filter((file) => !marked.has(file.path));
  return left.length === 1 ? left[0].path : null;
};

export interface MarkedTotals {
  count : number;
  bytes : number;
}

// What is marked (only paths of the groups on view, each counted once).
export const markedTotals = (groups: DuplicateGroup[], marked: Set<string>): MarkedTotals => {
  const seen = new Map<string, number>();
  groups.forEach((group) => group.files.forEach((file) => marked.has(file.path) && seen.set(file.path, file.size)));
  return { count: seen.size, bytes: [...seen.values()].reduce((total, size) => total + size, 0) };
};

// Every group keeps at least one copy (what Rust checks too, before quitting anything).
export const keepsOneInEach = (groups: DuplicateGroup[], marked: Set<string>): boolean => groups.every((group) => unmarkedIn(group, marked) >= 1);
