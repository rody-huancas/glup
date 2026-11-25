import { useCallback, useState, useSyncExternalStore } from 'react';
import type { AutoFoldersView } from '@/modules/auto-folders/interfaces/autoFoldersView';
import { answerAutoCatchUp, deleteAutoRule, duplicateAutoRule, resumeAutoRule, setAutoFoldersPaused, setAutoRuleEnabled } from '@/modules/auto-folders/services/autoFolders';
import { getAutoFoldersState, showAutoFolders, subscribeAutoFolders } from '@/modules/auto-folders/store/autoFoldersStore';

// The rules and what can be done with them from the list; a failed change says why.
export const useAutoFolders = () => {
  const { view, failed }  = useSyncExternalStore(subscribeAutoFolders, getAutoFoldersState);
  const [error, setError] = useState<string | null>(null);

  const apply = useCallback((change: Promise<AutoFoldersView>) => {
    setError(null);
    void change.then(showAutoFolders).catch((failure: unknown) => setError(String(failure)));
  }, []);

  return {
    view,
    failed,
    error,
    pauseAll  : (paused: boolean) => apply(setAutoFoldersPaused(paused)),
    setOn     : (id: string, enabled: boolean) => apply(setAutoRuleEnabled({ id, enabled })),
    duplicate : (id: string) => apply(duplicateAutoRule(id)),
    remove    : (id: string) => apply(deleteAutoRule(id)),
    catchUp   : (id: string, process: boolean) => apply(answerAutoCatchUp({ id, process })),
    resume    : (id: string) => apply(resumeAutoRule(id)),
  };
};

// Only the dot on Tu PC (a question or a download waits).
export const useAutoFoldersAttention = (): boolean => useSyncExternalStore(subscribeAutoFolders, getAutoFoldersState).view?.attention ?? false;
