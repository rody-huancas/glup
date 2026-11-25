import { useCallback } from 'react';
import { FamilyGrid } from '@/modules/families/components/FamilyGrid';
import type { FamilyId } from '@/modules/families/types/familyId';
import { familyPage } from '@/modules/families/utils/families';
import type { PageProps } from '@/modules/main-window/interfaces/pageProps';
import { requestShortcutFocus } from '@/modules/shortcuts/store/shortcutFocus';
import type { ShortcutTarget } from '@/modules/shortcuts/types/shortcutTarget';
import { ToolGroupSection } from '@/modules/tools/components/ToolGroupSection';
import { ToolSearchField } from '@/modules/tools/components/ToolSearchField';
import { ToolsEmpty } from '@/modules/tools/components/ToolsEmpty';
import { TOOLS_TEXTS } from '@/modules/tools/constants/texts';
import { useToolRunner } from '@/modules/tools/hooks/useToolRunner';
import { useToolSearch } from '@/modules/tools/hooks/useToolSearch';
import { PageHeader } from '@/shared/components/PageHeader';

// Habilidades: the search and the six families (each opens its screen). While searching, the tools found
// take the families' place, grouped by family; with the search empty again, the families come back.
export const ToolsPage = ({ files, onNavigate }: PageProps) => {
  const { query, setQuery, groups } = useToolSearch();
  const runTool                     = useToolRunner({ runTool: files.runTool, onNavigate });
  const openFamily                  = useCallback((family: FamilyId) => onNavigate(familyPage(family)), [onNavigate]);
  const searching                   = query.trim() !== '';

  // Straight to the shortcut in Ajustes, in view and focused.
  const changeShortcut = useCallback((target: ShortcutTarget) => {
    requestShortcutFocus(target);
    onNavigate('settings');
  }, [onNavigate]);

  return (
    <div className="flex h-full flex-col gap-4">
      <PageHeader title={TOOLS_TEXTS.title} subtitle={TOOLS_TEXTS.subtitle} />
      <ToolSearchField query={query} onChange={setQuery} />
      <div className="-mr-3 flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto scroll-thin pr-3 pb-6">
        {!searching && <FamilyGrid title={TOOLS_TEXTS.families} onOpen={openFamily} />}
        {searching && groups.map((group) => <ToolGroupSection key={group.family} group={group} onRun={runTool} onChangeShortcut={changeShortcut} />)}
        {searching && groups.length === 0 && <ToolsEmpty />}
      </div>
    </div>
  );
};
