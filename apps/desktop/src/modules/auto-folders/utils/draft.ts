import { TOOL_CHOICES, TOOL_GROUPS } from '@/modules/auto-folders/constants/choices';
import { AUTO_FOLDERS_TEXTS, GROUP_TEXTS, ORIGINAL_TEXTS, TOOL_TEXTS } from '@/modules/auto-folders/constants/texts';
import type { AutoRule } from '@/modules/auto-folders/interfaces/autoRule';
import type { RuleDraft } from '@/modules/auto-folders/interfaces/ruleDraft';
import type { RuleInput } from '@/modules/auto-folders/interfaces/ruleInput';
import type { RuleTemplate } from '@/modules/auto-folders/interfaces/ruleTemplate';
import type { AutoToolId } from '@/modules/auto-folders/types/autoToolId';

interface TemplateDraftParams {
  template : RuleTemplate;
  folder   : string;
}

const firstChoice = (tool: AutoToolId): string | null => TOOL_CHOICES[tool]?.options[0]?.value ?? null;

export const blankDraft = (folder: string): RuleDraft => ({
  id: null, name: '', folder, group: 'any', extensions: '', minMb: '', tool: 'folder-sort', choice: firstChoice('folder-sort'), original: 'keep', saveMode: 'same', saveFolder: null, enabled: true,
});

export const draftFromTemplate = ({ template, folder }: TemplateDraftParams): RuleDraft => ({ ...template.draft, id: null, name: template.title, folder, enabled: true });

// A tool chosen: its default option, and a type of file it can work on.
export const withTool = (draft: RuleDraft, tool: AutoToolId): RuleDraft => {
  const groups = TOOL_GROUPS[tool];
  return { ...draft, tool, choice: firstChoice(tool), group: groups.includes(draft.group) ? draft.group : groups[0] };
};

// The options Rust's actions take (the same shape as the panel's step).
export const optionsFor = (tool: AutoToolId, choice: string | null): Record<string, unknown> => {
  const value = choice ?? firstChoice(tool);
  if (tool === 'folder-sort') return { mode: value };
  if (tool === 'iphone-to-jpg') return { jpg: value };
  if (tool === 'convert-image') return { format: value };
  if (tool === 'compress-pdf') return { reduce: { level: value } };
  if (tool === 'compress-video') return { video: { goal: value } };
  if (tool === 'transcribe') return { level: value, language: 'es' };
  if (tool === 'remove-background') return { background: value };
  return {};
};

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

// And back, to edit a saved rule.
export const choiceOf = (tool: AutoToolId, options: Record<string, unknown>): string | null => {
  const nested = (key: string, inner: string): unknown => (isRecord(options[key]) ? (options[key] as Record<string, unknown>)[inner] : undefined);
  const found: unknown = {
    'folder-sort'       : options.mode,
    'iphone-to-jpg'     : options.jpg,
    'convert-image'     : options.format,
    'compress-image'    : undefined,
    'compress-pdf'      : nested('reduce', 'level'),
    'compress-video'    : nested('video', 'goal'),
    'transcribe'        : options.level,
    'remove-background' : options.background,
  }[tool];
  const known = TOOL_CHOICES[tool]?.options.some((option) => option.value === found);
  return known && typeof found === 'string' ? found : firstChoice(tool);
};

export const draftFromRule = (rule: AutoRule): RuleDraft => ({
  id         : rule.id,
  name       : rule.name,
  folder     : rule.folder,
  group      : rule.filter.group,
  extensions : rule.filter.extensions.join(', '),
  minMb      : rule.filter.minMb === null ? '' : String(rule.filter.minMb),
  tool       : rule.action.tool,
  choice     : choiceOf(rule.action.tool, rule.action.options),
  original   : rule.original,
  saveMode   : rule.destination.mode,
  saveFolder : rule.destination.folder,
  enabled    : rule.enabled,
});

export const extensionsOf = (typed: string): string[] =>
  typed.split(/[\s,;]+/).map((extension) => extension.trim().replace(/^\./, '').toLowerCase()).filter(Boolean);

const megabytesOf = (typed: string): number | null => {
  const value = Number(typed.trim().replace(',', '.'));
  return typed.trim() === '' || !Number.isFinite(value) || value <= 0 ? null : value;
};

// What is still missing before it can be saved (null: nothing).
export const draftProblem = (draft: RuleDraft): string | null => {
  if (!draft.folder) return AUTO_FOLDERS_TEXTS.folderNeeded;
  if (draft.group === 'custom' && extensionsOf(draft.extensions).length === 0) return AUTO_FOLDERS_TEXTS.extNeeded;
  if (draft.minMb.trim() !== '' && megabytesOf(draft.minMb) === null) return AUTO_FOLDERS_TEXTS.sizeWrong;
  return null;
};

// «Cuando llegue una foto de iPhone a Descargas, pasarlo a JPG y dejar el original».
export const sentenceOf = (draft: RuleDraft, folderName: string): string => {
  const extensions = extensionsOf(draft.extensions).map((extension) => `.${extension}`);
  const what       = draft.group === 'custom' && extensions.length > 0 ? `${GROUP_TEXTS.custom.sentence} ${extensions.join(' o ')}` : GROUP_TEXTS[draft.group].sentence;
  const size       = megabytesOf(draft.minMb);
  const big        = size === null ? '' : ` de más de ${String(size).replace('.', ',')} MB`;
  const choice     = TOOL_CHOICES[draft.tool]?.options.find((option) => option.value === draft.choice)?.label;
  const action     = [TOOL_TEXTS[draft.tool].sentence, choice].filter(Boolean).join(' ');
  const original   = draft.tool === 'folder-sort' ? '' : ` y ${ORIGINAL_TEXTS[draft.original].sentence}`;
  return `Cuando llegue ${what}${big} a ${folderName}, ${action}${original}`;
};

export const inputFromDraft = (draft: RuleDraft, folderName: string): RuleInput => ({
  id          : draft.id,
  name        : draft.name.trim() || sentenceOf(draft, folderName),
  folder      : draft.folder,
  filter      : { group: draft.group, extensions: draft.group === 'custom' ? extensionsOf(draft.extensions) : [], minMb: megabytesOf(draft.minMb) },
  action      : { tool: draft.tool, options: optionsFor(draft.tool, draft.choice) },
  original    : draft.tool === 'folder-sort' ? 'keep' : draft.original,
  destination : { mode: draft.tool === 'folder-sort' ? 'same' : draft.saveMode, folder: draft.saveMode === 'custom' ? draft.saveFolder : null },
  enabled     : draft.enabled,
});

// The last folder of a path, until Rust says how it is called («Descargas»).
export const folderLabel = (path: string): string => path.split(/[\\/]/).filter(Boolean).pop() ?? path;
