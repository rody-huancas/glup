import { useCallback, useMemo } from 'react';
import { ClipboardIntro } from '@/modules/clipboard/components/ClipboardIntro';
import { ClipboardToolbar } from '@/modules/clipboard/components/ClipboardToolbar';
import { ClipList } from '@/modules/clipboard/components/ClipList';
import { TurnOffDialog } from '@/modules/clipboard/components/TurnOffDialog';
import { CLIPBOARD_TEXTS } from '@/modules/clipboard/constants/texts';
import { useClipboardStatus } from '@/modules/clipboard/hooks/useClipboardStatus';
import { useClipKeys } from '@/modules/clipboard/hooks/useClipKeys';
import { useClips } from '@/modules/clipboard/hooks/useClips';
import { useCopyClip } from '@/modules/clipboard/hooks/useCopyClip';
import { useRemoveClips } from '@/modules/clipboard/hooks/useRemoveClips';
import { useTurnOffClipboard } from '@/modules/clipboard/hooks/useTurnOffClipboard';
import type { Clip } from '@/modules/clipboard/interfaces/clip';
import { setClipPinned } from '@/modules/clipboard/services/clipboard';
import type { PageProps } from '@/modules/main-window/interfaces/pageProps';
import { ConfirmDialog } from '@/shared/components/ConfirmDialog';
import { PageHeader } from '@/shared/components/PageHeader';
import { SelectAll } from '@/shared/components/SelectAll';
import { SelectionBar } from '@/shared/components/SelectionBar';
import { Skeleton } from '@/shared/components/Skeleton';
import { useCheckSelection } from '@/shared/hooks/useCheckSelection';

// Off: what it keeps and "Activar". On: the search, the list (pinned on top) and the checks to remove,
// as in Historial. The header and the search stay put; only the list scrolls.
export const ClipboardPage = ({ onNavigate }: PageProps) => {
  const clipboard = useClipboardStatus();
  const status    = clipboard.status;
  const switching = useTurnOffClipboard({ status, apply: clipboard.apply });
  const enabled   = status?.enabled ?? false;
  const list      = useClips(enabled);
  const clips     = useMemo(() => list.clips ?? [], [list.clips]);
  const ids       = useMemo(() => clips.map((clip) => clip.id), [clips]);
  const selection = useCheckSelection(ids);
  const copying   = useCopyClip();
  const removing  = useRemoveClips(selection.clear);
  const copy      = copying.copy;

  const copyTop = useCallback(() => {
    if (clips[0]) copy(clips[0].id);
  }, [clips, copy]);

  const keys = useClipKeys({ count: clips.length, query: list.query, setQuery: list.setQuery, onCopyTop: copyTop });
  const pin  = useCallback((clip: Clip) => void setClipPinned(clip.id, !clip.pinned).catch(() => undefined), []);
  const ask  = removing.ask;
  const one  = useCallback((id: string) => ask([id]), [ask]);

  const header = <PageHeader title={CLIPBOARD_TEXTS.title} subtitle={CLIPBOARD_TEXTS.subtitle} />;

  if (!status) {
    return (
      <div className="flex flex-col gap-6">
        {header}
        {clipboard.failed ? <p className="text-[13px] text-lilac-soft">{CLIPBOARD_TEXTS.failed}</p> : <Skeleton className="h-40 w-full" />}
      </div>
    );
  }

  if (!enabled) {
    return (
      <div className="flex flex-col gap-6">
        {header}
        <ClipboardIntro supported={status.supported} onTurnOn={() => switching.setEnabled(true)} onLater={() => onNavigate('tools')} />
      </div>
    );
  }

  const count = selection.selected.length;

  return (
    <div className="flex h-full flex-col gap-4">
      {header}
      <ClipboardToolbar
        query={list.query}
        pausedUntil={status.pausedUntil}
        searchRef={keys.searchRef}
        onQuery={list.setQuery}
        onKeyDown={keys.onSearchKeyDown}
        onPause={clipboard.pause}
        onResume={clipboard.resume}
        onTurnOff={() => switching.setEnabled(false)}
      />
      <p className="-mt-1 text-[12px] text-muted">{CLIPBOARD_TEXTS.private}</p>
      {(list.failed || removing.failed) && <p role="alert" className="text-[13px] text-lilac-soft">{list.failed ? CLIPBOARD_TEXTS.failed : CLIPBOARD_TEXTS.removeFailed}</p>}
      {list.clips === null && !list.failed && <Skeleton className="h-40 w-full" />}
      {list.clips !== null && clips.length === 0 && (
        <p className="text-[13px] text-muted">{list.query.trim() ? CLIPBOARD_TEXTS.noResults(list.query.trim()) : CLIPBOARD_TEXTS.empty}</p>
      )}
      {clips.length > 0 && (
        <>
          <div className="flex min-h-9 items-center justify-between gap-3">
            <SelectAll label={CLIPBOARD_TEXTS.selectAll} state={selection.state} onToggle={selection.toggleAll} />
            <SelectionBar count={count} onRemove={() => ask(selection.selected)} onCancel={selection.clear} />
          </div>
          <ClipList
            clips={clips}
            now={list.now}
            selected={selection.selected}
            copied={copying.copied}
            listRef={keys.listRef}
            onKeyDown={keys.onListKeyDown}
            onToggle={selection.toggle}
            onCopy={copy}
            onPin={pin}
            onRemove={one}
          />
        </>
      )}
      {switching.asking && <TurnOffDialog count={switching.count} onKeep={switching.keep} onDeleteAll={switching.deleteAll} onDismiss={switching.dismiss} />}
      {removing.pending && (
        <ConfirmDialog
          title={CLIPBOARD_TEXTS.removeTitle(removing.pending.length)}
          body={CLIPBOARD_TEXTS.removeBody}
          cancel={CLIPBOARD_TEXTS.removeCancel}
          confirm={CLIPBOARD_TEXTS.removeOk}
          onCancel={removing.cancel}
          onConfirm={removing.confirm}
        />
      )}
    </div>
  );
};
