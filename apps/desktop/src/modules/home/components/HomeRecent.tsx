import { revealFile } from '@/modules/actions/services/files';
import type { HistoryEntry } from '@/modules/history/interfaces/historyEntry';
import { useOpenEntry } from '@/modules/history/hooks/useOpenEntry';
import { getHistoryDetail } from '@/modules/history/utils/historyEntry';
import { DASHBOARD_TEXTS } from '@/modules/home/constants/dashboard';
import { toolOfEntry } from '@/modules/home/utils/quickTools';
import { ToolIcon } from '@/modules/tools/components/ToolIcon';
import { TOOLS } from '@/modules/tools/constants/tools';
import { SectionLabel } from '@/shared/components/SectionLabel';
import { FolderIcon } from '@/shared/icons/FolderIcon';

interface HomeRecentProps {
  entries  : HistoryEntry[];
  now      : Date;
  onSeeAll : () => void;
}

// "Lo último": the last three things done, with their result; a click opens the file and the folder
// button («Abrir carpeta») shows it in its folder.
export const HomeRecent = ({ entries, now, onSeeAll }: HomeRecentProps) => {
  const { open, missingId } = useOpenEntry();

  return (
    <section className="flex min-w-0 flex-col gap-2">
      <div className="flex items-center justify-between">
        <SectionLabel>{DASHBOARD_TEXTS.recent}</SectionLabel>
        <button type="button" onClick={onSeeAll} className="cursor-pointer rounded-md text-[12px] font-semibold text-lilac outline-none hover:text-lilac-soft focus-visible:outline-2 focus-visible:outline-lilac">
          {DASHBOARD_TEXTS.seeAll}
        </button>
      </div>
      {entries.length === 0 ? (
        <p className="rounded-[14px] border border-dashed border-line-strong px-3.5 py-3 text-[12px] text-muted">{DASHBOARD_TEXTS.recentEmpty}</p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {entries.map((entry) => {
            const tool = toolOfEntry(entry, TOOLS);

            return (
              <li key={entry.id} className="flex min-h-11 items-center gap-1 rounded-[12px] border border-line bg-raised pr-1 pl-1">
                <button
                  type="button"
                  disabled={!entry.path}
                  onClick={() => open(entry)}
                  className="flex min-w-0 flex-1 items-center gap-2.5 rounded-md text-left outline-none enabled:cursor-pointer focus-visible:outline-2 focus-visible:outline-lilac"
                >
                  {tool && <span className="scale-[0.8]"><ToolIcon icon={tool.icon} family={tool.family} /></span>}
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate text-[12px] font-semibold text-text">{entry.name}</span>
                    <span className="truncate text-[11px] text-muted">{missingId === entry.id ? DASHBOARD_TEXTS.missing : getHistoryDetail(entry, now)}</span>
                  </span>
                </button>
                {entry.path && (
                  <button
                    type="button"
                    onClick={() => void revealFile(entry.path)}
                    aria-label={DASHBOARD_TEXTS.openFolderOf(entry.name)}
                    title={DASHBOARD_TEXTS.openFolder}
                    className="flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-md text-lilac outline-none hover:bg-line focus-visible:outline-2 focus-visible:outline-lilac"
                  >
                    <FolderIcon className="size-4" />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
};
