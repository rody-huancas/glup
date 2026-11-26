import { useMemo } from 'react';
import { useDiskSpace } from '@/modules/cleanup/hooks/useDiskSpace';
import type { HistoryEntry } from '@/modules/history/interfaces/historyEntry';
import { HomePc } from '@/modules/home/components/HomePc';
import { HomeRecent } from '@/modules/home/components/HomeRecent';
import { HomeShortcuts } from '@/modules/home/components/HomeShortcuts';
import { HomeSuggestion } from '@/modules/home/components/HomeSuggestion';
import { POPULAR_TOOLS, RECENT_COUNT, SHORTCUT_COUNT } from '@/modules/home/constants/dashboard';
import { useSuggestion } from '@/modules/home/hooks/useSuggestion';
import type { HomeFiles } from '@/modules/home/interfaces/homeFiles';
import { topTools } from '@/modules/home/utils/quickTools';
import { fillShortcuts, toolsById } from '@/modules/home/utils/shortcuts';
import type { PageId } from '@/modules/main-window/types/pageId';
import { TOOLS } from '@/modules/tools/constants/tools';
import { useFavorites } from '@/modules/tools/hooks/useFavorites';
import { useToolRunner } from '@/modules/tools/hooks/useToolRunner';
import { knownFavorites } from '@/modules/tools/utils/favorites';

interface HomeDashboardProps {
  files      : HomeFiles;
  entries    : HistoryEntry[];
  now        : Date;
  onNavigate : (page: PageId) => void;
}

const POPULAR = toolsById(POPULAR_TOOLS, TOOLS);

// Under the top row of Inicio, all from this computer: «Atajos», Glup's suggestion as a thin line (only
// when there is one), and a row of two (stacked on the narrow panel): «Seguir donde quedamos» and «Tu PC».
export const HomeDashboard = ({ files, entries, now, onNavigate }: HomeDashboardProps) => {
  const { space }             = useDiskSpace(0);
  const { suggestion, close } = useSuggestion(space);
  const favorites             = knownFavorites(useFavorites(), TOOLS);
  const runTool               = useToolRunner({ runTool: files.runTool, onNavigate });
  const used                  = useMemo(() => topTools({ entries, tools: TOOLS, limit: SHORTCUT_COUNT }), [entries]);
  const shortcuts             = fillShortcuts({ favorites, used, popular: POPULAR, limit: SHORTCUT_COUNT });

  return (
    <>
      <HomeShortcuts tools={shortcuts} onRun={runTool} />
      {suggestion && <HomeSuggestion suggestion={suggestion} onNavigate={onNavigate} onClose={close} />}
      <div className="grid shrink-0 grid-cols-1 gap-3 @2xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <HomeRecent entries={entries.slice(0, RECENT_COUNT)} now={now} onSeeAll={() => onNavigate('history')} />
        <HomePc disk={space} onNavigate={onNavigate} />
      </div>
    </>
  );
};
