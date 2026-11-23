import toolsJson from '@/modules/tools/constants/tools.json';
import type { ActionTool } from '@/modules/tools/interfaces/actionTool';
import type { Tool } from '@/modules/tools/types/tool';
import type { ToolSection } from '@/modules/tools/types/toolSection';
import { isWindows } from '@/shared/utils/platform';

// Copiar texto de la pantalla reads with the OCR of Windows: on other systems it does not show.
export const TOOLS = (toolsJson as Tool[]).filter((tool) => tool.kind !== 'command' || isWindows());

// Herramientas rápidas in Inicio: the action tools marked with a quickTitle.
export const QUICK_TOOLS = TOOLS.filter((tool): tool is ActionTool => tool.kind === 'action' && Boolean(tool.quickTitle));

export const TOOL_SECTIONS: ToolSection[] = ['pdf', 'images', 'videos', 'text', 'files', 'pc'];
