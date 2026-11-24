import { useSyncExternalStore } from 'react';
import { isPanelOpen, subscribePanel } from '@/modules/island/store/panelStore';

export const usePanelOpen = (): boolean => useSyncExternalStore(subscribePanel, isPanelOpen);
