import { useSyncExternalStore } from 'react';
import { getCleanup, subscribeCleanup } from '@/modules/cleanup/store/cleanupStore';

export const useCleanup = () => useSyncExternalStore(subscribeCleanup, getCleanup);
