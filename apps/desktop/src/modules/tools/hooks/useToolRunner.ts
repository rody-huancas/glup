import { useCallback } from 'react';
import type { HomeFiles } from '@/modules/home/interfaces/homeFiles';
import type { PageId } from '@/modules/main-window/types/pageId';
import type { Tool } from '@/modules/tools/types/tool';

interface UseToolRunnerParams {
  runTool    : HomeFiles['runTool'];
  onNavigate : (page: PageId) => void;
}

// Action tools ask for files and continue in Inicio, where the drop flow lives; the others open their screen.
export const useToolRunner = ({ runTool, onNavigate }: UseToolRunnerParams) =>
  useCallback((tool: Tool) => {
    if (tool.kind === 'page') return onNavigate(tool.page);

    void runTool(tool).then((picked) => {
      if (picked) onNavigate('home');
    });
  }, [runTool, onNavigate]);
