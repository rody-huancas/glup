import type { ActionId } from '@/modules/actions/types/actionId';
import type { ExplorerRequest } from '@/modules/explorer/interfaces/explorerRequest';
import type { ActionTool } from '@/modules/tools/interfaces/actionTool';
import type { Tool } from '@/modules/tools/types/tool';

// The option chosen in the right click, if it is still an action of tools.json.
const requestTool = (request: ExplorerRequest, tools: Tool[]): ActionTool | null => {
  const tool = request.tool === null ? null : tools.find((item) => item.id === request.tool);
  return tool?.kind === 'action' ? tool : null;
};

// Its action; null for "Enviar a" or an option that is gone (the files just load in Inicio).
export const requestAction = (request: ExplorerRequest, tools: Tool[]): ActionId | null => requestTool(request, tools)?.actionId ?? null;

interface PanelParams {
  request : ExplorerRequest;
  tools   : Tool[];
  // The action was chosen for those files (false: refused, they do not fit it, or "Enviar a").
  chosen  : boolean;
}

// The island opens when something is left to do there: the option's step (tools.json says it), or a
// choice (the files are in Inicio without their action). Otherwise it only tells the end.
export const needsPanel = ({ request, tools, chosen }: PanelParams): boolean => !chosen || (requestTool(request, tools)?.menuNeedsStep ?? true);
