import { useCallback } from 'react';
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

// The header and the search stay put; only the list scrolls.
export const ToolsPage = ({ files, onNavigate }: PageProps) => {
  const { query, setQuery, groups } = useToolSearch();
  const runTool                     = useToolRunner({ runTool: files.runTool, onNavigate });

  // Straight to the shortcut in Ajustes, in view and focused.
  const changeShortcut = useCallback((target: ShortcutTarget) => {
    requestShortcutFocus(target);
    onNavigate('settings');
  }, [onNavigate]);

  return (
    <div className="flex h-full flex-col gap-4">
      <PageHeader title={TOOLS_TEXTS.title} subtitle={TOOLS_TEXTS.subtitle} />
      <ToolSearchField query={query} onChange={setQuery} />
      <div className="-mr-3 flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto scroll-thin pr-3">
        {groups.map((group) => <ToolGroupSection key={group.family} group={group} onRun={runTool} onChangeShortcut={changeShortcut} />)}
        {groups.length === 0 && <ToolsEmpty />}
      </div>
    </div>
  );
};
