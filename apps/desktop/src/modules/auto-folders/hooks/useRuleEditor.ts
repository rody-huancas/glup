import { useCallback, useEffect, useMemo, useState } from 'react';
import type { RuleDraft } from '@/modules/auto-folders/interfaces/ruleDraft';
import type { RulePreview } from '@/modules/auto-folders/interfaces/rulePreview';
import { previewAutoRule, saveAutoRule } from '@/modules/auto-folders/services/autoFolders';
import { showAutoFolders } from '@/modules/auto-folders/store/autoFoldersStore';
import { draftProblem, folderLabel, inputFromDraft } from '@/modules/auto-folders/utils/draft';

interface UseRuleEditorParams {
  initial : RuleDraft;
  onSaved : () => void;
}

// What the rule would do with what is already there is asked each time it changes (a moment later, so
// typing does not read the folder at every key).
const PREVIEW_DELAY_MS = 350;

export const useRuleEditor = ({ initial, onSaved }: UseRuleEditorParams) => {
  const [draft, setDraft]                 = useState(initial);
  const [preview, setPreview]             = useState<RulePreview | null>(null);
  const [previewing, setPreviewing]       = useState(false);
  const [applyExisting, setApplyExisting] = useState(false);
  const [saving, setSaving]               = useState(false);
  const [error, setError]                 = useState<string | null>(null);
  const problem                           = draftProblem(draft);
  const folderName                        = preview?.folderName ?? folderLabel(draft.folder);
  const input                             = useMemo(() => inputFromDraft(draft, folderName), [draft, folderName]);

  useEffect(() => {
    if (problem) {
      setPreview(null);
      return;
    }
    let current = true;
    setPreviewing(true);
    const timer = window.setTimeout(() => {
      void previewAutoRule(input)
        .then((next) => current && setPreview(next))
        .catch((failure: unknown) => current && setError(String(failure)))
        .finally(() => current && setPreviewing(false));
    }, PREVIEW_DELAY_MS);
    return () => {
      current = false;
      window.clearTimeout(timer);
    };
  }, [input, problem]);

  const change = useCallback((next: Partial<RuleDraft> | ((draft: RuleDraft) => RuleDraft)) => {
    setError(null);
    setDraft((current) => (typeof next === 'function' ? next(current) : { ...current, ...next }));
  }, []);

  const save = useCallback(() => {
    if (problem) return;
    setSaving(true);
    void saveAutoRule({ rule: input, applyExisting: applyExisting && (preview?.total ?? 0) > 0 })
      .then((view) => {
        showAutoFolders(view);
        onSaved();
      })
      .catch((failure: unknown) => setError(String(failure)))
      .finally(() => setSaving(false));
  }, [problem, input, applyExisting, preview, onSaved]);

  return { draft, change, preview, previewing, applyExisting, setApplyExisting, problem, error, saving, save, folderName };
};
