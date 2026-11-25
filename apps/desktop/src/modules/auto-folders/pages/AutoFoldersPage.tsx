import { useEffect, useState } from 'react';
import { RuleCard } from '@/modules/auto-folders/components/RuleCard';
import { RuleEditor } from '@/modules/auto-folders/components/RuleEditor';
import { TemplatePicker } from '@/modules/auto-folders/components/TemplatePicker';
import { AUTO_FOLDERS_TEXTS } from '@/modules/auto-folders/constants/texts';
import { useAutoFolders } from '@/modules/auto-folders/hooks/useAutoFolders';
import type { AutoRule } from '@/modules/auto-folders/interfaces/autoRule';
import type { RuleDraft } from '@/modules/auto-folders/interfaces/ruleDraft';
import { blankDraft, draftFromRule, draftFromTemplate } from '@/modules/auto-folders/utils/draft';
import { getSortFolder } from '@/modules/folder-sort/services/folderSort';
import type { PageProps } from '@/modules/main-window/interfaces/pageProps';
import { Button } from '@/shared/components/Button';
import { ConfirmDialog } from '@/shared/components/ConfirmDialog';
import { PageHeader } from '@/shared/components/PageHeader';
import { SectionLabel } from '@/shared/components/SectionLabel';
import { Skeleton } from '@/shared/components/Skeleton';
import { Switch } from '@/shared/components/Switch';

// «Carpetas automáticas»: the rules, each with a switch, what it did and when; a switch for all of them;
// templates to start from and the editor of one rule.
export const AutoFoldersPage = (_props: PageProps) => {
  const folders                     = useAutoFolders();
  const [editing, setEditing]       = useState<RuleDraft | null>(null);
  const [removing, setRemoving]     = useState<AutoRule | null>(null);
  const [downloads, setDownloads]   = useState('');
  const [now, setNow]               = useState(() => new Date());
  const view                        = folders.view;

  useEffect(() => {
    void getSortFolder().then((folder) => setDownloads(folder ?? '')).catch(() => undefined);
  }, []);

  // The «hace 5 minutos» stay right while the screen is open.
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title={AUTO_FOLDERS_TEXTS.title} subtitle={AUTO_FOLDERS_TEXTS.subtitle} />

      {editing ? (
        <RuleEditor key={editing.id ?? 'new'} initial={editing} onSaved={() => setEditing(null)} onCancel={() => setEditing(null)} />
      ) : !view ? (
        folders.failed ? <p className="text-sm text-muted">{AUTO_FOLDERS_TEXTS.errorTitle}</p> : <Skeleton className="h-32 w-full" />
      ) : (
        <>
          {view.rules.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Switch label={AUTO_FOLDERS_TEXTS.pauseAll} hint={AUTO_FOLDERS_TEXTS.pauseAllHint} checked={view.pausedAll} accent="pc" onChange={folders.pauseAll} />
              <Button variant="pc" onClick={() => setEditing(blankDraft(downloads))} className="h-9">{AUTO_FOLDERS_TEXTS.newRule}</Button>
            </div>
          )}
          {folders.error && <p role="alert" className="text-xs text-danger">{folders.error}</p>}

          {view.rules.length > 0 ? (
            <section className="flex flex-col gap-3">
              <SectionLabel>{AUTO_FOLDERS_TEXTS.rules}</SectionLabel>
              <ul className="flex flex-col gap-3">
                {view.rules.map((rule) => (
                  <RuleCard
                    key={rule.id}
                    rule={rule}
                    now={now}
                    onToggle={(enabled) => folders.setOn(rule.id, enabled)}
                    onEdit={() => setEditing(draftFromRule(rule))}
                    onDuplicate={() => folders.duplicate(rule.id)}
                    onRemove={() => setRemoving(rule)}
                    onCatchUp={(process) => folders.catchUp(rule.id, process)}
                    onLearned={() => folders.resume(rule.id)}
                  />
                ))}
              </ul>
            </section>
          ) : (
            <div className="flex flex-col gap-1">
              <p className="text-sm font-semibold text-text">{AUTO_FOLDERS_TEXTS.emptyTitle}</p>
              <p className="text-sm text-muted">{AUTO_FOLDERS_TEXTS.emptyBody}</p>
            </div>
          )}

          <TemplatePicker onPick={(template) => setEditing(draftFromTemplate({ template, folder: downloads }))} onScratch={() => setEditing(blankDraft(downloads))} />
        </>
      )}

      {removing && (
        <ConfirmDialog
          title={AUTO_FOLDERS_TEXTS.removeTitle(removing.name)}
          body={AUTO_FOLDERS_TEXTS.removeBody}
          confirm={AUTO_FOLDERS_TEXTS.removeYes}
          cancel={AUTO_FOLDERS_TEXTS.removeNo}
          onCancel={() => setRemoving(null)}
          onConfirm={() => {
            folders.remove(removing.id);
            setRemoving(null);
          }}
        />
      )}
    </div>
  );
};
