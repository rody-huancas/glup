import type { CategoryId } from '@/modules/cleanup/types/categoryId';

// Same order as Rust checks them.
export const CATEGORY_ORDER: CategoryId[] = ['temp', 'browsers', 'recycle-bin', 'installers', 'archives', 'duplicates', 'large-files'];

// Only what Windows and the browsers make again is marked from the start.
export const MARKED_BY_DEFAULT: CategoryId[] = ['temp', 'browsers'];

// The recycle bin is emptied as a whole: one mark for the category.
export const RECYCLE_BIN_KEY = 'recycle-bin';

// Below this share of free space, the disk bar warns.
export const LOW_SPACE_SHARE = 0.1;

// A result older than this is dropped: the files may have changed since.
export const RESULT_LIFETIME_MS = 30 * 60 * 1000;
export const EXPIRY_CHECK_MS   = 60 * 1000;

export const ITEM_ROW_HEIGHT = 40;
export const ITEMS_MAX_HEIGHT = 240;
export const ITEMS_OVERSCAN   = 6;
