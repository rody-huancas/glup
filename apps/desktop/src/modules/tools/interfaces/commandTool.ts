import type { ToolBase } from '@/modules/tools/interfaces/toolBase';
import type { ToolCommand } from '@/modules/tools/types/toolCommand';

// Does something on its own, with no files (Copiar texto de la pantalla).
export interface CommandTool extends ToolBase {
  kind    : 'command';
  command : ToolCommand;
}
