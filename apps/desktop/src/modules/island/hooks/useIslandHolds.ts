import { useSyncExternalStore } from 'react';
import { getIslandHolds, subscribeIslandHolds } from '@/modules/island/store/islandHolds';

export const useIslandHolds = (): number => useSyncExternalStore(subscribeIslandHolds, getIslandHolds);
