import { useMemo } from 'react';
import { useDiskSpace } from '@/modules/cleanup/hooks/useDiskSpace';
import { useHistory } from '@/modules/history/hooks/useHistory';
import { ActivityCard } from '@/modules/home/components/ActivityCard';
import { HomePc } from '@/modules/home/components/HomePc';
import { HomeQuickTools } from '@/modules/home/components/HomeQuickTools';
import { HomeRecent } from '@/modules/home/components/HomeRecent';
import { HomeSuggestion } from '@/modules/home/components/HomeSuggestion';
import { QUICK_LIMIT, RECENT_COUNT } from '@/modules/home/constants/dashboard';
import { useSuggestion } from '@/modules/home/hooks/useSuggestion';
import type { HomeFiles } from '@/modules/home/interfaces/homeFiles';
import { topTools } from '@/modules/home/utils/quickTools';
import type { PageId } from '@/modules/main-window/types/pageId';
import { TOOLS } from '@/modules/tools/constants/tools';
import { useFavorites } from '@/modules/tools/hooks/useFavorites';
import { useToolRunner } from '@/modules/tools/hooks/useToolRunner';
import { knownFavorites } from '@/modules/tools/utils/favorites';

interface HomeDashboardProps {
  files      : HomeFiles;
  onNavigate : (page: PageId) => void;
}

// Under the mint strip of Inicio, all from this computer: Glup's suggestion (when there is one), «Lo que
// hicimos» with its numbers and chart, and a row of three (two on the narrow panel of a side):
// "Accesos rápidos", "Lo último" and "Tu PC".
export const HomeDashboard = ({ files, onNavigate }: HomeDashboardProps) => {
  const { entries, now }      = useHistory();
  const { space }             = useDiskSpace(0);
  const { suggestion, close } = useSuggestion(space);
  const favorites             = knownFavorites(useFavorites(), TOOLS).slice(0, QUICK_LIMIT);
  const runTool               = useToolRunner({ runTool: files.runTool, onNavigate });
  const used                  = useMemo(() => topTools({ entries, tools: TOOLS, limit: QUICK_LIMIT }), [entries]);
  const quick                 = favorites.length > 0 ? favorites : used;

  return (
    <>
      {suggestion && <HomeSuggestion suggestion={suggestion} onNavigate={onNavigate} onClose={close} />}
      <ActivityCard entries={entries} now={now} />
      <div className="grid shrink-0 grid-cols-2 gap-3 @2xl:grid-cols-3">
        <HomeQuickTools tools={quick} favorites={favorites.length > 0} onRun={runTool} />
        <HomeRecent entries={entries.slice(0, RECENT_COUNT)} now={now} onSeeAll={() => onNavigate('history')} />
        <HomePc disk={space} onNavigate={onNavigate} />
      </div>
    </>
  );
};
