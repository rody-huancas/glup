import { useCallback, useEffect, useRef } from 'react';
import { openIsland, takeExplorerRequests } from '@/modules/explorer/services/explorer';
import { needsPanel, requestAction } from '@/modules/explorer/utils/request';
import type { HomeFiles } from '@/modules/home/interfaces/homeFiles';
import type { PageId } from '@/modules/main-window/types/pageId';
import { TOOLS } from '@/modules/tools/constants/tools';
import { EXPLORER_REQUEST_EVENT } from '@/shared/constants/events';
import { useTauriEvent } from '@/shared/hooks/useTauriEvent';

interface ExplorerRequestsParams {
  files      : HomeFiles;
  onNavigate : (page: PageId) => void;
}

// Files from the Explorer, one request at a time: they load in Inicio and the option chosen there runs.
// An option without a step (tools.json, menuNeedsStep) runs with the usual options and the island only
// tells the end; one with a step, "Enviar a" or files Glup cannot take open the panel on it.
export const useExplorerRequests = ({ files, onNavigate }: ExplorerRequestsParams) => {
  const latest = useRef(files);
  const busy   = useRef(false);

  useEffect(() => {
    latest.current = files;
  }, [files]);

  const drain = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    try {
      for (const request of await takeExplorerRequests()) {
        onNavigate('home');
        const chosen = await latest.current.openWith({ paths: request.paths, actionId: requestAction(request, TOOLS) });
        if (needsPanel({ request, tools: TOOLS, chosen })) await openIsland();
      }
    } catch {
      // Nothing came, or the panel is not ready: the next event asks again.
    } finally {
      busy.current = false;
    }
  }, [onNavigate]);

  // What arrived before the panel was ready (Glup started from the Explorer), then each new one.
  useEffect(() => {
    void drain();
  }, [drain]);
  useTauriEvent<null>(EXPLORER_REQUEST_EVENT, () => void drain());
};
