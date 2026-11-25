import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { AUTO_FOLDERS_TEXTS } from '@/modules/auto-folders/constants/texts';
import type { AutoFoldersView } from '@/modules/auto-folders/interfaces/autoFoldersView';
import type { RuleInput } from '@/modules/auto-folders/interfaces/ruleInput';
import type { RulePreview } from '@/modules/auto-folders/interfaces/rulePreview';
import {
  ANSWER_AUTO_CATCH_UP,
  DELETE_AUTO_RULE,
  DUPLICATE_AUTO_RULE,
  GET_AUTO_FOLDERS,
  PREVIEW_AUTO_RULE,
  RESUME_AUTO_RULE,
  SAVE_AUTO_RULE,
  SET_AUTO_FOLDERS_PAUSED,
  SET_AUTO_RULE_ENABLED,
  UNDO_AUTO_TRASH,
} from '@/shared/constants/events';

interface SaveRuleParams {
  rule          : RuleInput;
  applyExisting : boolean;
}

interface RuleEnabledParams {
  id      : string;
  enabled : boolean;
}

interface CatchUpParams {
  id      : string;
  process : boolean;
}

export const getAutoFolders = (): Promise<AutoFoldersView> => invoke<AutoFoldersView>(GET_AUTO_FOLDERS);

export const saveAutoRule = ({ rule, applyExisting }: SaveRuleParams): Promise<AutoFoldersView> => invoke<AutoFoldersView>(SAVE_AUTO_RULE, { request: { rule, applyExisting } });

export const deleteAutoRule = (id: string): Promise<AutoFoldersView> => invoke<AutoFoldersView>(DELETE_AUTO_RULE, { id });

export const duplicateAutoRule = (id: string): Promise<AutoFoldersView> => invoke<AutoFoldersView>(DUPLICATE_AUTO_RULE, { id });

export const setAutoRuleEnabled = ({ id, enabled }: RuleEnabledParams): Promise<AutoFoldersView> => invoke<AutoFoldersView>(SET_AUTO_RULE_ENABLED, { id, enabled });

export const setAutoFoldersPaused = (paused: boolean): Promise<AutoFoldersView> => invoke<AutoFoldersView>(SET_AUTO_FOLDERS_PAUSED, { paused });

// Only looks: nothing is done until the rule is saved.
export const previewAutoRule = (rule: RuleInput): Promise<RulePreview> => invoke<RulePreview>(PREVIEW_AUTO_RULE, { rule });

export const answerAutoCatchUp = ({ id, process }: CatchUpParams): Promise<AutoFoldersView> => invoke<AutoFoldersView>(ANSWER_AUTO_CATCH_UP, { id, process });

export const resumeAutoRule = (id: string): Promise<AutoFoldersView> => invoke<AutoFoldersView>(RESUME_AUTO_RULE, { id });

export const undoAutoTrash = (undo: string): Promise<string> => invoke<string>(UNDO_AUTO_TRASH, { undo });

export const pickRuleFolder = async (current: string | null): Promise<string | null> => {
  const result = await open({ directory: true, multiple: false, title: AUTO_FOLDERS_TEXTS.pickTitle, defaultPath: current ?? undefined });
  return typeof result === 'string' ? result : null;
};
