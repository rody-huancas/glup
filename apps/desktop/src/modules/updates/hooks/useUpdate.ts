import { useSyncExternalStore } from 'react';
import { checkNow, getUpdateState, installNow, subscribeUpdate } from '@/modules/updates/store/updateStore';

export const useUpdate = () => {
  const state = useSyncExternalStore(subscribeUpdate, getUpdateState);

  return { ...state, check: checkNow, install: installNow };
};
