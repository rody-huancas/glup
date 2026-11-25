import toolsJson from '@/modules/tools/constants/tools.json';
import type { Tool } from '@/modules/tools/types/tool';
import { isWindows } from '@/shared/utils/platform';

// Copiar texto de la pantalla reads with the OCR of Windows: on other systems it does not show.
export const TOOLS = (toolsJson as Tool[]).filter((tool) => tool.kind !== 'command' || isWindows());
