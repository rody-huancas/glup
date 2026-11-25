import { FAMILIES } from '@/modules/families/constants/families';
import { familyOfPage } from '@/modules/families/utils/families';
import { NAV_ITEMS, SETTINGS_ITEM } from '@/modules/main-window/constants/navigation';
import type { PageId } from '@/modules/main-window/types/pageId';

// The name of a screen the way back can lead to: an item of the bar or a family.
export const pageTitle = (page: PageId): string => {
  const family = familyOfPage(page);
  if (family) return FAMILIES[family].name;
  return [...NAV_ITEMS, SETTINGS_ITEM].find((item) => item.id === page)?.label ?? '';
};
