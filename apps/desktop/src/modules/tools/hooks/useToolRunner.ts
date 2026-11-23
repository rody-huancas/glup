import { useCallback } from 'react';
import type { HomeFiles } from '@/modules/home/interfaces/homeFiles';
import type { PageId } from '@/modules/main-window/types/pageId';
import { startScreenText } from '@/modules/screen-text/services/screenText';
import type { Tool } from '@/modules/tools/types/tool';

interface UseToolRunnerParams {
  runTool    : HomeFiles['runTool'];
  onNavigate : (page: PageId) => void;
}

// Action tools ask for files and continue in Inicio, where the drop flow lives; page tools open their
// screen and command tools just start (the island hides while the zone of the screen is chosen).
export const useToolRunner = ({ runTool, onNavigate }: UseToolRunnerParams) =>
  useCallback((tool: Tool) => {
    if (tool.kind === 'page') return onNavigate(tool.page);
    if (tool.kind === 'command') return void startScreenText().catch(() => undefined);

    void runTool(tool).then((picked) => {
      if (picked) onNavigate('home');
    });
  }, [runTool, onNavigate]);
