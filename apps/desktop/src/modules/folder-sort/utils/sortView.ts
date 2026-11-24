import { SKIP_REASON_TEXTS } from '@/modules/folder-sort/constants/texts';
import type { SkippedFile } from '@/modules/folder-sort/interfaces/skippedFile';
import type { SkipReason } from '@/modules/folder-sort/types/skipReason';

// A group lists this many files at most; the rest are counted ("y 340 archivos más").
export const VISIBLE_FILES = 60;

export interface ReasonCount {
  reason : SkipReason;
  label  : string;
  count  : number;
}

const ORDER: SkipReason[] = ['downloading', 'in-use', 'hidden', 'recent', 'changed'];

// How many were left for each reason, in a fixed order and without the empty ones.
export const countReasons = (skipped: SkippedFile[]): ReasonCount[] =>
  ORDER.map((reason) => ({ reason, label: SKIP_REASON_TEXTS[reason], count: skipped.filter((file) => file.reason === reason).length })).filter((item) => item.count > 0);

// The files of a group to show, and how many more there are.
export const visibleFiles = <T>(files: T[], limit = VISIBLE_FILES): { shown: T[]; hidden: number } => ({
  shown  : files.slice(0, limit),
  hidden : Math.max(files.length - limit, 0),
});
