import { useEffect } from 'react';
import { holdIsland } from '@/modules/island/store/islandHolds';

// Keeps the island open while `active` (a dialog of a page, for instance).
export const useIslandHold = (active: boolean) => {
  useEffect(() => (active ? holdIsland() : undefined), [active]);
};
