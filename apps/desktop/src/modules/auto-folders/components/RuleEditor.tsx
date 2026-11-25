import { AUTO_TOOL_ORDER, TOOL_CHOICES, TOOL_GROUPS } from '@/modules/auto-folders/constants/choices';
import { AUTO_FOLDERS_TEXTS, GROUP_TEXTS, ORIGINAL_TEXTS, TOOL_TEXTS } from '@/modules/auto-folders/constants/texts';
import { RulePreviewBox } from '@/modules/auto-folders/components/RulePreviewBox';
import { useRuleEditor } from '@/modules/auto-folders/hooks/useRuleEditor';
import type { RuleDraft } from '@/modules/auto-folders/interfaces/ruleDraft';
import { pickRuleFolder } from '@/modules/auto-folders/services/autoFolders';
import type { AutoToolId } from '@/modules/auto-folders/types/autoToolId';
import type { FileGroup } from '@/modules/auto-folders/types/fileGroup';
import type { OriginalChoice } from '@/modules/auto-folders/types/originalChoice';
import { sentenceOf, withTool } from '@/modules/auto-folders/utils/draft';
import { SAVE_OPTIONS } from '@/modules/settings/constants/saveLocation';
import type { SaveMode } from '@/modules/settings/types/saveMode';
import { Button } from '@/shared/components/Button';
import { SectionLabel } from '@/shared/components/SectionLabel';

interface RuleEditorProps {
  initial  : RuleDraft;
  onSaved  : () => void;
  onCancel : () => void;
}

const SELECT = 'h-8 max-w-full cursor-pointer rounded-control border border-line-strong bg-raised px-2 text-[12px] font-semibold text-text focus-visible:outline-2 focus-visible:outline-fam-pc';
const FIELD  = 'h-8 rounded-control border border-line-strong bg-raised px-2 text-[12px] text-text placeholder:text-muted focus-visible:outline-2 focus-visible:outline-fam-pc';

// The rule as a sentence to fill: «Cuando llegue [tipo] a [carpeta], [acción] y [el original]»; under it,
// what it would do with what is already in the folder.
export const RuleEditor = ({ initial, onSaved, onCancel }: RuleEditorProps) => {
  const editor = useRuleEditor({ initial, onSaved });
  const draft  = editor.draft;
  const choice = TOOL_CHOICES[draft.tool];
  const sorts  = draft.tool === 'folder-sort';

  const chooseFolder = async (current: string) => {
    const folder = await pickRuleFolder(current || null);
    if (folder) editor.change({ folder });
  };

  const chooseSave = async (mode: SaveMode) => {
    if (mode !== 'custom') return editor.change({ saveMode: mode, saveFolder: null });
    const folder = await pickRuleFolder(draft.saveFolder);
    if (folder) editor.change({ saveMode: 'custom', saveFolder: folder });
  };

  return (
    <section className="flex flex-col gap-4">
      <SectionLabel>{draft.id ? AUTO_FOLDERS_TEXTS.editTitle : AUTO_FOLDERS_TEXTS.newTitle}</SectionLabel>

      <div className="flex flex-wrap items-center gap-x-2 gap-y-2 rounded-[14px] border border-line bg-raised p-3.5 text-[13px] text-text">
        <span>{AUTO_FOLDERS_TEXTS.when}</span>
        <select aria-label={AUTO_FOLDERS_TEXTS.whatLabel} value={draft.group} onChange={(event) => editor.change({ group: event.target.value as FileGroup })} className={SELECT}>
          {TOOL_GROUPS[draft.tool].map((group) => <option key={group} value={group}>{GROUP_TEXTS[group].label}</option>)}
        </select>
        {draft.group === 'custom' && (
          <input aria-label={AUTO_FOLDERS_TEXTS.extensions} value={draft.extensions} placeholder={AUTO_FOLDERS_TEXTS.extensionsAt} onChange={(event) => editor.change({ extensions: event.target.value })} className={`${FIELD} w-28`} />
        )}
        <span>{AUTO_FOLDERS_TEXTS.to}</span>
        <Button variant="secondary" onClick={() => void chooseFolder(draft.folder)} className="h-8 max-w-56 px-3 text-[12px]">
          <span className="truncate">{draft.folder ? editor.folderName : AUTO_FOLDERS_TEXTS.folderPick}</span>
        </Button>
        <span>,</span>
        <select aria-label={AUTO_FOLDERS_TEXTS.actionLabel} value={draft.tool} onChange={(event) => editor.change((current) => withTool(current, event.target.value as AutoToolId))} className={SELECT}>
          {AUTO_TOOL_ORDER.map((tool) => <option key={tool} value={tool}>{TOOL_TEXTS[tool].label}</option>)}
        </select>
        {choice && (
          <select aria-label={choice.label} value={draft.choice ?? ''} onChange={(event) => editor.change({ choice: event.target.value })} className={SELECT}>
            {choice.options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        )}
        {!sorts && (
          <>
            <span>{AUTO_FOLDERS_TEXTS.then}</span>
            <select aria-label={AUTO_FOLDERS_TEXTS.originalLbl} value={draft.original} onChange={(event) => editor.change({ original: event.target.value as OriginalChoice })} className={SELECT}>
              {(['keep', 'trash'] as OriginalChoice[]).map((original) => <option key={original} value={original}>{ORIGINAL_TEXTS[original].label}</option>)}
            </select>
          </>
        )}
      </div>

      <p className="text-xs text-muted">{sentenceOf(draft, editor.folderName)}. {AUTO_FOLDERS_TEXTS.onlyLoose}</p>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-3 text-[12px] text-text">
        <label className="flex items-center gap-2">
          {AUTO_FOLDERS_TEXTS.onlyBig}
          <input inputMode="decimal" value={draft.minMb} onChange={(event) => editor.change({ minMb: event.target.value })} className={`${FIELD} w-16`} />
          {AUTO_FOLDERS_TEXTS.megabytes}
        </label>
        {!sorts && (
          <label className="flex items-center gap-2">
            {AUTO_FOLDERS_TEXTS.saveIn}
            <select value={draft.saveMode} onChange={(event) => void chooseSave(event.target.value as SaveMode)} className={SELECT}>
              {SAVE_OPTIONS.map((option) => <option key={option.mode} value={option.mode}>{option.mode === 'custom' && draft.saveFolder ? draft.saveFolder : option.label}</option>)}
            </select>
          </label>
        )}
        <label className="flex min-w-0 flex-1 items-center gap-2">
          {AUTO_FOLDERS_TEXTS.name}
          <input value={draft.name} placeholder={sentenceOf(draft, editor.folderName)} onChange={(event) => editor.change({ name: event.target.value })} className={`${FIELD} min-w-0 flex-1`} />
        </label>
      </div>

      {sorts && <p className="text-xs text-muted">{AUTO_FOLDERS_TEXTS.sortNote}</p>}
      {!sorts && draft.original === 'trash' && <p className="text-xs text-muted">{AUTO_FOLDERS_TEXTS.trashNote}</p>}

      <RulePreviewBox preview={editor.preview} previewing={editor.previewing} applyExisting={editor.applyExisting} onApply={editor.setApplyExisting} />

      {(editor.problem ?? editor.error) && <p role="alert" className="text-xs text-danger">{editor.problem ?? editor.error}</p>}
      <div className="flex gap-2">
        <Button variant="pc" onClick={editor.save} disabled={Boolean(editor.problem) || editor.saving} className="h-9">
          {draft.id ? AUTO_FOLDERS_TEXTS.save : AUTO_FOLDERS_TEXTS.activate}
        </Button>
        <Button variant="secondary" onClick={onCancel} className="h-9">{AUTO_FOLDERS_TEXTS.cancel}</Button>
      </div>
    </section>
  );
};
