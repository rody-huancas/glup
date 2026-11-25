import { useState } from 'react';
import { formatFileSize } from '@/modules/actions/utils/fileSize';
import type { PageProps } from '@/modules/main-window/interfaces/pageProps';
import { ItemActions } from '@/modules/space/components/ItemActions';
import { SpaceCrumbs } from '@/modules/space/components/SpaceCrumbs';
import { SpaceLegend } from '@/modules/space/components/SpaceLegend';
import { SpaceList } from '@/modules/space/components/SpaceList';
import { SpaceMap } from '@/modules/space/components/SpaceMap';
import { KIND_HEX, KIND_LABELS, SPACE_TEXTS } from '@/modules/space/constants/texts';
import { useSpace } from '@/modules/space/hooks/useSpace';
import type { SpaceItem } from '@/modules/space/interfaces/spaceView';
import { pickSpaceFolder } from '@/modules/space/services/space';
import { Button } from '@/shared/components/Button';
import { ConfirmDialog } from '@/shared/components/ConfirmDialog';
import { PageHeader } from '@/shared/components/PageHeader';
import { SectionLabel } from '@/shared/components/SectionLabel';
import { formatCount } from '@/shared/utils/numbers';

// "Qué ocupa espacio": the disk or folder to look in, then the map (with the way back on top) and, beside
// it, the same as a list, the summary by kind and the biggest files; what was chosen, with its actions.
export const SpacePage = ({ onNavigate }: PageProps) => {
  const space                   = useSpace();
  const [chosen, setChosen]     = useState<SpaceItem | null>(null);
  const [asking, setAsking]     = useState<SpaceItem | null>(null);
  const view                    = space.view;
  const enter = (item: SpaceItem) => {
    setChosen(null);
    space.enter(item.id);
  };
  const choose = () => {
    void pickSpaceFolder().then((folder) => folder && space.setRoot(folder));
  };
  const totals = view?.totals;
  // The top of the way: «Tu carpeta», the disk, or the folder chosen.
  const place     = space.places.find((each) => each.path === space.root);
  const rootLabel = place ? (space.places.indexOf(place) === 0 ? SPACE_TEXTS.yourFolder : place.label) : view?.crumbs[0]?.name ?? '';

  return (
    <div className="@container flex flex-col gap-4">
      <PageHeader title={SPACE_TEXTS.title} subtitle={SPACE_TEXTS.subtitle} crumbs={view && <SpaceCrumbs crumbs={view.crumbs} rootLabel={rootLabel} onEnter={enter} />} />
      <div className="flex flex-wrap items-end gap-2">
        <label className="flex min-w-56 flex-col gap-1 text-[11px] font-semibold text-muted">
          {SPACE_TEXTS.where}
          <select value={space.root ?? ''} onChange={(event) => space.setRoot(event.target.value)} disabled={space.running} className="h-10 rounded-control border border-line-strong bg-raised px-2 text-[13px] text-text outline-none focus:border-fam-pc">
            {space.places.map((place) => (
              <option key={place.path} value={place.path}>
                {place.total > 0 ? `${place.label} · ${SPACE_TEXTS.free(formatFileSize(place.free), formatFileSize(place.total))}` : place.label}
              </option>
            ))}
            {space.root && !space.places.some((place) => place.path === space.root) && <option value={space.root}>{space.root}</option>}
          </select>
        </label>
        <Button variant="secondary" onClick={choose} disabled={space.running} className="h-10">{SPACE_TEXTS.folder}</Button>
        <Button variant="pc" onClick={space.analyze} disabled={space.running || !space.root} className="h-10 disabled:cursor-not-allowed disabled:opacity-50">{view ? SPACE_TEXTS.again : SPACE_TEXTS.analyze}</Button>
        <span className="flex-1" />
        <Button variant="secondary" onClick={() => onNavigate('cleanup')} className="h-10">{SPACE_TEXTS.cleanup}</Button>
        <Button variant="secondary" onClick={() => onNavigate('duplicates')} className="h-10">{SPACE_TEXTS.duplicates}</Button>
      </div>
      <p aria-live="polite" className="text-[12px] text-muted">
        {space.queued ? SPACE_TEXTS.queued : space.running ? space.progress : totals?.cancelled ? SPACE_TEXTS.stopped : totals?.done ? SPACE_TEXTS.took(totals.seconds.toFixed(1).replace('.', ',')) : ''}
      </p>
      {space.problem && <p role="alert" className="text-[12px] text-danger">{space.problem}</p>}
      {!view ? (
        <p className="text-[13px] text-muted">{SPACE_TEXTS.empty}</p>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-5 @3xl:grid-cols-[minmax(0,1.4fr)_minmax(300px,1fr)]">
            <div className="flex min-w-0 flex-col gap-3">
              <SpaceLegend />
              {view.children.length > 0 ? <SpaceMap items={view.children} selected={chosen?.id ?? null} onEnter={enter} onSelect={setChosen} /> : <p className="text-[13px] text-muted">{SPACE_TEXTS.nothing}</p>}
              {view.folder.id !== 0 && !chosen && (
                <div className="flex flex-wrap items-center gap-2 rounded-control border border-line bg-raised p-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold text-text" title={view.folder.path}>{SPACE_TEXTS.thisFolder(view.folder.name)}</p>
                    <p className="text-[12px] text-muted">{formatFileSize(view.folder.size)} · {SPACE_TEXTS.files(formatCount(view.folder.files))}</p>
                    {view.folder.note && <p className="text-[12px] text-text">{view.folder.note}</p>}
                  </div>
                  <ItemActions item={view.folder} onTrash={() => setAsking(view.folder)} />
                </div>
              )}
              {chosen && (
                <div className="flex flex-wrap items-center gap-2 rounded-control border border-line bg-raised p-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold text-text" title={chosen.path}>{chosen.name}</p>
                    <p className="text-[12px] text-muted">{formatFileSize(chosen.size)}</p>
                    {chosen.note && <p className="text-[12px] text-text">{chosen.note}</p>}
                  </div>
                  <ItemActions item={chosen} onTrash={() => setAsking(chosen)} />
                </div>
              )}
              {totals && (totals.cloudFiles > 0 || totals.denied > 0 || totals.links > 0 || totals.hardLinks > 0) && (
                <details className="text-[12px] text-muted">
                  <summary className="cursor-pointer font-semibold text-text outline-none focus-visible:ring-2 focus-visible:ring-fam-pc">{SPACE_TEXTS.details}</summary>
                  <ul className="mt-1.5 flex list-disc flex-col gap-1 pl-4">
                    {totals.denied > 0 && <li>{SPACE_TEXTS.denied(formatCount(totals.denied))}</li>}
                    {totals.hardLinks > 0 && <li>{SPACE_TEXTS.hardLinks}</li>}
                    {totals.cloudFiles > 0 && <li>{SPACE_TEXTS.cloud(formatCount(totals.cloudFiles), formatFileSize(totals.cloudBytes))}</li>}
                    {totals.links > 0 && <li>{SPACE_TEXTS.links}</li>}
                  </ul>
                </details>
              )}
            </div>
            <div className="flex min-w-0 flex-col gap-4">
              <SpaceList items={view.children} total={view.folder.size} rest={view.rest} selected={chosen?.id ?? null} onEnter={enter} onSelect={setChosen} />
              <section className="flex flex-col gap-1.5">
                <SectionLabel>{SPACE_TEXTS.kinds}</SectionLabel>
                <ul className="flex flex-col gap-1">
                  {view.kinds.slice().sort((a, b) => b.size - a.size).map((total) => (
                    <li key={total.kind} className="flex items-center gap-2 text-[13px]">
                      <span aria-hidden className="size-2.5 rounded-sm" style={{ backgroundColor: KIND_HEX[total.kind] }} />
                      <span className="flex-1 text-text">{KIND_LABELS[total.kind]}</span>
                      <span className="font-semibold text-text tabular-nums">{formatFileSize(total.size)}</span>
                    </li>
                  ))}
                </ul>
              </section>
              <section className="flex flex-col gap-1.5">
                <SectionLabel>{SPACE_TEXTS.biggest}</SectionLabel>
                <ol className="flex flex-col gap-0.5">
                  {view.biggest.map((file) => (
                    <li key={file.id}>
                      <button type="button" onClick={() => setChosen(file)} aria-pressed={file.id === chosen?.id} className="flex w-full cursor-pointer items-center gap-2 rounded-control px-2 py-1 text-left outline-none hover:bg-raised focus-visible:ring-2 focus-visible:ring-fam-pc">
                        <span aria-hidden className="size-2.5 shrink-0 rounded-sm" style={{ backgroundColor: KIND_HEX[file.kind] }} />
                        <span className="min-w-0 flex-1 truncate text-[12px] text-text" title={file.path}>{file.name}</span>
                        <span className="shrink-0 text-[12px] font-semibold text-text tabular-nums">{formatFileSize(file.size)}</span>
                      </button>
                    </li>
                  ))}
                </ol>
              </section>
            </div>
          </div>
        </>
      )}
      {asking && (
        <ConfirmDialog
          title={SPACE_TEXTS.trashTitle(asking.name)}
          body={SPACE_TEXTS.trashBody(formatFileSize(asking.size))}
          confirm={SPACE_TEXTS.trashYes}
          cancel={SPACE_TEXTS.trashNo}
          onCancel={() => setAsking(null)}
          onConfirm={() => {
            space.trash(asking.id);
            setAsking(null);
            setChosen(null);
          }}
        />
      )}
    </div>
  );
};
