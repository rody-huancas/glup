import { LOW_SPACE_SHARE } from '@/modules/cleanup/constants/categories';
import type { DiskSpace } from '@/modules/cleanup/interfaces/diskSpace';

export const usedShare = (space: DiskSpace): number => (space.total > 0 ? 1 - space.free / space.total : 0);

// Less than 10% free: the bar and the text warn.
export const isLowSpace = (space: DiskSpace): boolean => space.total > 0 && space.free / space.total < LOW_SPACE_SHARE;
